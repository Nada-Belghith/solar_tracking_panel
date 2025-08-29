require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const axios = require('axios');
const config = require('../config');



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
    email: config.solarman.email,
    password: config.solarman.password,
    orgId: config.solarman.orgId,
    appSecret: config.solarman.appSecret,
  };
  const params = {
    appId:config.solarman.appId,
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

/**
 * Fonction pour récupérer le siteId d'un onduleur à partir de son numéro de série
 * @param {string} deviceSn - Le même numéro de série que celui utilisé dans fetchCurrentData
 */
const fetchDeviceSiteId = async (deviceSn) => {
  if (isTokenExpired()) {
    console.log('Token expired, fetching new one...');
    await fetchToken();
  }

  try {
    const response = await axios.get(
      'https://globalpro.solarmanpv.com/maintain-s/operating/system/device/INVERTER/list',
      {
        headers: {
          'Authorization': `Bearer ${cachedToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          size: 50,
          sn: deviceSn,
          'order.direction': 'ASC',
          'order.property': 'name',
          powerTypeList: 'PV'
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      const device = response.data.data[0];
      return device.siteId;
    }

    throw new Error('Device not found or no siteId available');
  } catch (error) {
    console.error('Error fetching device siteId:', error.message);
    throw error;
  }
};

/**
 * Fonction pour récupérer l'historique de puissance pour une date spécifique
 * @param {string} deviceSn - Le numéro de série du dispositif
 * @param {number} year - L'année (ex: 2025)
 * @param {number} month - Le mois (1-12)
 * @param {number} day - Le jour (1-31)
 */
const fetchPowerHistory = async (deviceSn, year, month, day) => {
  if (isTokenExpired()) {
    console.log('Token expired, fetching new one...');
    await fetchToken();
  }

  try {
    const siteId = await fetchDeviceSiteId(deviceSn);
    
    const response = await axios.get(
      `https://globalpro.solarmanpv.com/maintain-s/history/power/${siteId}/record`,
      {
      headers: {
        'Authorization': `Bearer ${cachedToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        year,
        month,
        day, // jour fixé à 24
      },
      timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching power history:', error.message);
    throw error;
  }
};

/**
 * Récupère les statistiques mensuelles de production pour un onduleur
 * @param {string} deviceSn - numéro de série du dispositif
 * @param {number} year - année (ex: 2025)
 * @param {number} month - mois (1-12)
 */
const fetchMonthlyPowerStats = async (deviceSn, year, month) => {
  if (isTokenExpired()) {
    console.log('Token expired, fetching new one...');
    await fetchToken();
  }

  try {
    const siteId = await fetchDeviceSiteId(deviceSn);

    const response = await axios.get(
      `https://globalpro.solarmanpv.com/maintain-s/history/power/${siteId}/stats/month`,
      {
        headers: {
          'Authorization': `Bearer ${cachedToken}`,
          'Content-Type': 'application/json'
        },
        params: { year, month },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching monthly power stats:', error.message || error);
    throw error;
  }
};

module.exports = { 
  fetchToken, 
  fetchCurrentData,
  fetchDeviceSiteId,
  fetchPowerHistory,
  fetchMonthlyPowerStats
};
