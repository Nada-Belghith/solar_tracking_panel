const express = require('express');
const router = express.Router();
const { reconnectThingsBoardWS } = require('../services/thingsboard');

router.post('/update-thingsboard', async (req, res) => {
  const { deviceId, deviceToken } = req.body;

  if (!deviceId || !deviceToken) {
    return res.status(400).json({ error: 'deviceId and deviceToken are required' });
  }

  try {
    console.log('🔍 [DEBUG] Received from frontend:', { deviceId, deviceToken });
    // io est passé depuis server.js
    await reconnectThingsBoardWS(req.app.get('io'), deviceId, deviceToken);
    console.log('✅ [BACKEND] Updated ThingsBoard connection details:', { deviceId, deviceToken });
    res.status(200).json({ message: 'ThingsBoard connection updated successfully' });
  } catch (error) {
    console.error('❌ [BACKEND] Error reconnecting to ThingsBoard:', error);
    res.status(500).json({ error: 'Failed to reconnect to ThingsBoard' });
  }
});

module.exports = router;
