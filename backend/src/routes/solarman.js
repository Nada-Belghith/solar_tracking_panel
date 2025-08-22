const express = require('express');
const router = express.Router();
const { fetchToken, fetchCurrentData } = require('../services/solarman');

/**
 * POST /token
 * Récupère un nouveau token si expiré, sinon retourne le cache
 */
router.post('/token', async (req, res) => {
  try {
    const newToken = await fetchToken(req.body);
    return res.status(200).json(newToken);
  } catch (err) {
    console.error('Token fetch error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Solarman token failed', detail: err.message });
  }
});

/**
 * POST /currentData
 * Vérifie le token et appelle Solarman currentData
 */
router.post('/currentData', async (req, res) => {
  try {
    const deviceSn = req.body?.deviceSn;
    if (!deviceSn) {
      return res.status(400).json({ error: 'deviceSn is required in the request body' });
    }

    const data = await fetchCurrentData(deviceSn);
    return res.status(200).json(data);
  } catch (err) {
    console.error('currentData error:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json(
      err.response?.data || { error: 'Failed to fetch current data' }
    );
  }
});

module.exports = router;
