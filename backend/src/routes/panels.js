const express = require('express');
const axios = require('axios');
const { query } = require('../services/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/list', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        sp.id as panel_id,
        sp.name as panel_name,
        sp.device_id_thingsboard,
        sp.token_thingsboard,
        sp.device_sn,
        c.name as client_name,
        c.address,
        c.latitude,
        c.longitude,
        c.elevation
      FROM solar_panel sp
      INNER JOIN clients c ON c.id = sp.client_id
      ORDER BY sp.name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des panneaux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// Route pour mettre à jour la connexion ThingsBoard
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const { deviceId, token } = req.body;
    
    if (!deviceId || !token) {
      return res.status(400).json({ error: 'deviceId et token sont requis' });
    }

    // Mettre à jour la configuration ThingsBoard
    process.env.TB_DEVICE = deviceId;
    process.env.TB_ACCESS_TOKEN = token;

    // Reconnecter le WebSocket
    const io = req.app.get('io'); // Accéder à l'instance io
    const { reconnectThingsBoardWS } = require('../services/thingsboard');
    
    await reconnectThingsBoardWS(io);
    
    res.json({ status: 'ok', message: 'Connexion ThingsBoard mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Nouvelle route pour configurer un appareil
router.post('/configureDevice', authenticateToken, async (req, res) => {
  try {
    const { panelId } = req.body;

    if (!panelId) {
      return res.status(400).json({ error: 'panelId est requis' });
    }

    console.log('🔍 panelId reçu dans /configureDevice:', panelId);

    const { configureDevice } = require('../services/thingsboard');

    // Appeler la fonction configureDevice
    await configureDevice(panelId);

    res.json({ status: 'ok', message: 'Appareil configuré avec succès' });
  } catch (error) {
    console.error('Erreur lors de la configuration de l\'appareil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Endpoint: update the inverter serial for a panel
router.post('/updateDeviceSN', authenticateToken, async (req, res) => {
  try {
    const { panelId, device_sn } = req.body;

    if (!panelId || typeof device_sn === 'undefined') {
      return res.status(400).json({ error: 'panelId et device_sn sont requis' });
    }

    console.log('Mise à jour device_sn pour panelId', panelId, '->', device_sn);

    const result = await query(`
      UPDATE solar_panel
      SET device_sn = $1
      WHERE id = $2
    `, [device_sn, panelId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Panneau non trouvé' });
    }

    res.json({ success: true, message: 'Numéro de série mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du numéro de série:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
