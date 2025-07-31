// ───────────────────────────────────────────────
// Point d'entrée de l'application
// ───────────────────────────────────────────────
require('dotenv').config();

// ───────────────────────────────────────────────
// Importation des dépendances et configurations
// ───────────────────────────────────────────────
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Import des configurations et services
const config = require('./src/config');
const authRoutes = require('./src/routes/auth');
const clientsRoutes = require('./src/routes/clients');
const thingsboardRoutes = require('./src/routes/thingsboard');
const panelsRoutes = require('./src/routes/panels');
const { connectThingsBoardWS, createTelemetryTable, insertTelemetryForPanel } = require('./src/services/thingsboard');

// ───────────────────────────────────────────────
// Initialisation Express + Middleware
// ───────────────────────────────────────────────
const app = express();

// Création du serveur HTTP et configuration de Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.cors.origins,
    methods: ["GET", "POST"]
  }
});

// Middleware de base
app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || config.cors.origins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));

// Configuration Passport
app.use(passport.initialize());

// Configuration de Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: config.google.clientId,
  clientSecret: config.google.clientSecret,
  callbackURL: config.google.callbackURL,
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// ───────────────────────────────────────────────
// Configuration des routes
// ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/', clientsRoutes);
app.use('/api/panels', panelsRoutes);
app.use('/api', thingsboardRoutes);

// Routes d'authentification Google OAuth
app.get('/api/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

app.get('/api/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/login',
  session: false
}), async (req, res) => {
  try {
    const user = req.user;
    console.log('✅ Utilisateur Google authentifié:', user.displayName);

    const token = jwt.sign({
      name: user.displayName,
      email: user.emails[0].value,
      picture: user.photos[0].value
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    console.log('🔑 Token généré:', token); // Log du token généré

    res.redirect(`${process.env.FRONT_URL || 'http://localhost:5000'}/auth/success?token=${token}`);
  } catch (error) {
    console.error('❌ Erreur lors de la génération du token:', error);
    res.redirect(`${process.env.FRONT_URL || 'http://localhost:5000'}/login?error=auth_failed`);
  }
});

// Map pour suivre les connexions par deviceId
const deviceConnections = new Map();

// Gestion des connexions WebSocket
io.on('connection', socket => {
  const deviceId = socket.handshake.query.deviceId;
  const panelName = socket.handshake.query.panelName; // Nom du panneau transmis par le client

  // Si ce deviceId a déjà une connexion active, fermer l'ancienne
  if (deviceId && deviceConnections.has(deviceId)) {
    const existingSocket = deviceConnections.get(deviceId);
    console.log(`🔄 Fermeture de la connexion existante pour le deviceId: ${deviceId}`);
    existingSocket.disconnect(true);
  }

  // Enregistrer la nouvelle connexion
  if (deviceId) {
    deviceConnections.set(deviceId, socket);
  }

  console.log('🟢 Client WebSocket connecté:', socket.id);
  console.log(`📊 Nombre total de connexions actives: ${io.engine.clientsCount}`);

  // Créer une table pour le panneau si elle n'existe pas
  if (panelName) {
    createTelemetryTable(panelName).catch(err => {
      console.error(`❌ Erreur lors de la création de la table pour ${panelName}:`, err.message);
    });
  }

  // Écouter uniquement les événements de connexion/déconnexion
  socket.on('disconnect', (reason) => {
    // Supprimer la connexion de notre map si c'était la dernière pour ce deviceId
    if (deviceId && deviceConnections.get(deviceId)?.id === socket.id) {
      deviceConnections.delete(deviceId);
    }

    console.log(`🔴 Client WebSocket déconnecté (${reason}):`, socket.id);
    console.log(`📊 Nombre de connexions restantes: ${io.engine.clientsCount - 1}`);
    console.log(`📊 Nombre de devices connectés: ${deviceConnections.size}`);
  });

  socket.on('selectClient', ({ deviceId, token }) => {
    console.log(`🔧 Client sélectionné: deviceId=${deviceId}`);

    // Connecter au WebSocket ThingsBoard pour ce client
    connectThingsBoardWS(io, deviceId, token).catch((err) => {
      console.error(`Erreur lors de la connexion au WebSocket pour ${deviceId}:`, err.message);
    });
  });

  socket.on('telemetry', (data) => {
    if (panelName) {
      insertTelemetryForPanel(panelName, data).catch(err => {
        console.error(`❌ Erreur lors de l'insertion des télémétries pour ${panelName}:`, err.message);
      });
    }
  });
});

// Démarrage du serveur
const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`🚀 Serveur démarré sur le port ${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('❌ Port ' + port + ' est déjà utilisé. Tentative avec le port ' + (port + 1));
    server.listen(port + 1);
  } else {
    console.error('❌ Erreur serveur:', err);
  }
});
