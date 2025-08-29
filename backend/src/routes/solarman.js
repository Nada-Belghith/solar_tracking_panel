const express = require('express');
const router = express.Router();
const { fetchToken, fetchCurrentData, fetchPowerHistory, fetchMonthlyPowerStats } = require('../services/solarman');

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

/**
 * GET /power-history/:deviceSn
 * Récupère l'historique de puissance pour une date donnée
 */
router.get('/power-history/:deviceSn', async (req, res) => {
  try {
    const { deviceSn } = req.params;
    const { year, month, day } = req.query;

    if (!deviceSn || !year || !month || !day) {
      return res.status(400).json({
        error: 'Paramètres manquants. deviceSn, year, month et day sont requis.'
      });
    }

    const powerHistory = await fetchPowerHistory(deviceSn, parseInt(year), parseInt(month), parseInt(day));
    res.json(powerHistory);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /monthly/:deviceSn/:year/:month
 * Récupère les statistiques mensuelles de production
 */
router.get('/monthly/:deviceSn/:year/:month', async (req, res) => {
  const { deviceSn, year, month } = req.params;
  try {
    const data = await fetchMonthlyPowerStats(deviceSn, Number(year), Number(month));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error in /api/solarman/monthly:', err.message || err);
    res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
});

module.exports = router;
