const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../services/db');
const { getTbToken } = require('../services/thingsboard');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Champs requis manquants.' });

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email }, 
      config.jwt.secret, 
      { expiresIn: '1d' }
    );

    console.log('🔑 Token généré:', token); // Log du token généré

    let tbToken = null;
    try {
      tbToken = await getTbToken();
      console.log('🔑 Token ThingsBoard généré:', tbToken); // Log du token ThingsBoard
    } catch (err) {
      console.error('Login TB:', err.message);
    }

    console.log('✅ Réponse envoyée avec le token:', { token, tbToken }); // Log de la réponse
    res.json({ 
      status: 'ok', 
      user: { id: user.id, name: user.name, email: user.email }, 
      token, 
      tbToken 
    });
  } catch (err) {
    console.error('Login:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }
  
  try {
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Email déjà utilisé.' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
      [name, email, hash]
    );
    
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Inscription:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
