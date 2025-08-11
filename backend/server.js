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

const config = require('./src/config');
const authRoutes = require('./src/routes/auth');
const clientsRoutes = require('./src/routes/clients');
const thingsboardRoutes = require('./src/routes/thingsboard');
const panelsRoutes = require('./src/routes/panels');
const { connectThingsBoardWS } = require('./src/services/thingsboard');

// ───────────────────────────────────────────────
// Initialisation Express + Middleware
// ───────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST']
  }
});

app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || config.cors.origins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(passport.initialize());

// ───────────────────────────────────────────────
// Configuration Passport Google
// ───────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: config.google.clientId,
  clientSecret: config.google.clientSecret,
  callbackURL: config.google.callbackURL,
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// ───────────────────────────────────────────────
// Routes REST
// ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/', clientsRoutes);
app.use('/api/panels', panelsRoutes);
app.use('/api', thingsboardRoutes);

// Google OAuth
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
    const token = jwt.sign({
      name: user.displayName,
      email: user.emails[0].value,
      picture: user.photos[0].value
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.redirect(`${process.env.FRONT_URL || 'http://localhost:5000'}/auth/success?token=${token}`);
  } catch (error) {
    console.error('❌ Erreur lors de la génération du token:', error);
    res.redirect(`${process.env.FRONT_URL || 'http://localhost:5000'}/login?error=auth_failed`);
  }
});

// ───────────────────────────────────────────────
// WebSocket Logic
// ───────────────────────────────────────────────
const deviceConnections = new Map();

io.on('connection', (socket) => {
  console.log('🟢 Nouvelle connexion WebSocket:', socket.id);

  socket.on('subscribe', ({ deviceId, token }) => {
    if (!deviceId || !token) {
      console.error('❌ deviceId ou token manquant');
      return;
    }

    let isValidToken = true;
    try {
      if (token.split('.').length === 3) {
        const decoded = jwt.verify(token, config.jwt.secret);
        console.log('✅ JWT vérifié pour:', decoded.email || decoded.name);
      } else {
        console.log('ℹ️ Token non-JWT accepté (ThingsBoard)');
      }
    } catch (err) {
      console.error('❌ Token JWT invalide:', err.message);
      isValidToken = false;
    }

    if (!isValidToken) return;

    socket.join(deviceId);
    deviceConnections.set(deviceId, socket);

    console.log(`📡 Souscription au device ${deviceId}`);

    connectThingsBoardWS(io, deviceId, token)
      .catch((err) => {
        console.error(`❌ Erreur ThingsBoard WebSocket pour ${deviceId}:`, err.message);
      });
  });

  socket.on('unsubscribe', ({ deviceId }) => {
    console.log(`🔴 Désabonnement du deviceId: ${deviceId}`);
    socket.leave(deviceId);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔴 Déconnexion (${reason}):`, socket.id);
    for (let [id, s] of deviceConnections.entries()) {
      if (s.id === socket.id) {
        deviceConnections.delete(id);
        break;
      }
    }
  });
});

// ───────────────────────────────────────────────
// Démarrage serveur
// ───────────────────────────────────────────────
const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`🚀 Serveur backend démarré sur le port ${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${port} utilisé. Tentative avec le port ${port + 1}`);
    server.listen(port + 1);
  } else {
    console.error('❌ Erreur serveur:', err);
  }
});
