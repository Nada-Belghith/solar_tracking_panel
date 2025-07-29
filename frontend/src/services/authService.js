// Durée de la session en millisecondes (2 heures)
const SESSION_DURATION = 2 * 60 * 60 * 1000;
// Temps avant expiration pour renouveler automatiquement (5 minutes)
const RENEWAL_THRESHOLD = 5 * 60 * 1000;
let inactivityTimeout = null;
let renewalInterval = null;

const createToken = (userData) => {
  const now = Date.now();
  const exp = now + SESSION_DURATION;
  
  const tokenData = {
    ...userData,
    iat: Math.floor(now / 1000),
    exp: Math.floor(exp / 1000)
  };

  // Encodage simple en base64 pour simuler un JWT
  const base64Token = btoa(JSON.stringify(tokenData));
  return `fake.${base64Token}.signature`;
};

const parseToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch (e) {
    return null;
  }
};

const renewToken = () => {
  const currentToken = localStorage.getItem('jwt');
  if (!currentToken) return;

  const payload = parseToken(currentToken);
  if (!payload) return;

  // Créer un nouveau token avec les mêmes données mais une nouvelle expiration
  const newToken = createToken({
    name: payload.name,
    email: payload.email,
    picture: payload.picture
  });

  localStorage.setItem('jwt', newToken);
  resetInactivityTimer();
};

const resetInactivityTimer = () => {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
  }
  
  inactivityTimeout = setTimeout(() => {
    console.log('Session expirée par inactivité');
    logout();
  }, SESSION_DURATION);
};

const startActivityMonitoring = () => {
  // Liste des événements à surveiller
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

  // Nettoyer les anciens listeners si ils existent
  stopActivityMonitoring();

  // Ajouter les listeners pour chaque type d'événement
  events.forEach(eventName => {
    window.addEventListener(eventName, handleUserActivity);
  });

  // Démarrer le timer d'inactivité
  resetInactivityTimer();

  // Démarrer la vérification périodique pour le renouvellement
  renewalInterval = setInterval(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    const payload = parseToken(token);
    if (!payload) return;

    const timeUntilExpiry = payload.exp * 1000 - Date.now();
    if (timeUntilExpiry < RENEWAL_THRESHOLD) {
      renewToken();
    }
  }, 1000);
};

const stopActivityMonitoring = () => {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(eventName => {
    window.removeEventListener(eventName, handleUserActivity);
  });

  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
  }

  if (renewalInterval) {
    clearInterval(renewalInterval);
  }
};

const handleUserActivity = () => {
  resetInactivityTimer();
  
  const token = localStorage.getItem('jwt');
  if (!token) return;

  const payload = parseToken(token);
  if (!payload) return;

  const timeUntilExpiry = payload.exp * 1000 - Date.now();
  if (timeUntilExpiry < RENEWAL_THRESHOLD) {
    renewToken();
  }
};

const logout = () => {
  localStorage.removeItem('jwt');
  stopActivityMonitoring();
  window.location.href = '/login';
};

export const authService = {
  createToken,
  parseToken,
  renewToken,
  startActivityMonitoring,
  stopActivityMonitoring,
  logout,
  SESSION_DURATION,
  RENEWAL_THRESHOLD
};
