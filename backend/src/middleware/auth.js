const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    console.error('❌ Aucun token trouvé dans les en-têtes de la requête.');
    return res.status(401).json({ message: 'Accès non autorisé. Aucun token fourni.' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      console.error('❌ Token invalide ou expiré:', err.message);
      return res.status(401).json({ message: 'Accès non autorisé. Token invalide ou expiré.' });
    }
    req.user = user;
    console.log('✅ Token valide. Utilisateur authentifié:', user);
    next();
  });
}

module.exports = authenticateToken;
