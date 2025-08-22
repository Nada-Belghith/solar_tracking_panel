const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;

/**
 * Vérifie si le token est expiré
 */
const isTokenExpired = () => {
  return !cachedToken || !tokenExpiry || Date.now() >= tokenExpiry;
};

/**
 * Fonction pour récupérer un token Solarman
 */
const fetchToken = async (bodyCreds = {}) => {
  const payload = {
    email: "mourad.loulou@candela.com.tn",
    password:"c52bb2d217642d1e42f64f9cdd8078f24790cb81a8fd47fe27f2b3ccb440aa31",
    orgId: 84199,
    appSecret:"bab5f8609f51ca02f6ac6615cbbf2a90",
  };
  const params = {
    appId:"302407176243092",
    language: 'en',
  };

  const resp = await axios.post(
    'https://globalapi.solarmanpv.com/account/v1.0/token',
    payload,
    {
      params,
      headers: { 'Content-Type': 'application/json'},
      timeout: 10000,
    }
  );

  cachedToken = resp.data.access_token;
  tokenExpiry = Date.now() + parseInt(resp.data.expires_in) * 1000;

  return { token: cachedToken, expiresIn: tokenExpiry };
};

/**
 * Fonction pour récupérer les données actuelles de Solarman
 */
const fetchCurrentData = async (deviceSn) => {
  if (isTokenExpired()) {
    console.log('Token expired, fetching new one...');
    await fetchToken();
  }

  const response = await axios.post(
    'https://globalapi.solarmanpv.com/device/v1.0/currentData',
    { deviceSn },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cachedToken}`,
      },
      params: { language: 'en' },
      timeout: 10000,
    }
  );

  return response.data;
};

module.exports = { fetchToken, fetchCurrentData };
