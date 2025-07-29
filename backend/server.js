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
const { connectThingsBoardWS } = require('./src/services/thingsboard');

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
app.use('/api/clients', clientsRoutes);
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
    
    res.redirect(`${process.env.FRONT_URL || 'http://localhost:5000'}/auth/success?token=${token}`);
  } catch (error) {
    console.error('❌ Erreur lors de la génération du token:', error);
    res.redirect(`${process.env.FRONT_URL || 'http://localhost:5000'}/login?error=auth_failed`);
  }
});

// Gestion des connexions WebSocket
io.on('connection', socket => {
  console.log('🟢 Client WebSocket connecté:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔴 Client WebSocket déconnecté:', socket.id);
  });
});

// Connexion initiale à ThingsBoard WebSocket
connectThingsBoardWS(io).catch(err => {
  console.error('❌ Erreur de connexion à ThingsBoard:', err);
});

// Démarrage du serveur
const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`🚀 Serveur démarré sur le port ${port}`);
});
