const axios = require('axios');
const WebSocket = require('ws');
const config = require('../config');
const { insertTelemetry } = require('./telemetry');
let tbToken = null;
let tokenExpires = 0;
let currentWs = null;

async function getTbToken() {
  const now = Date.now();
  if (tbToken && now < tokenExpires) {
    console.log('Using cached ThingsBoard token');
    return tbToken;
  }
  
  console.log('ThingsBoard config:', {
    baseUrl: config.thingsboard.baseUrl,
    usernameSet: !!config.thingsboard.username,
    passwordSet: !!config.thingsboard.password
  });

  try {
    console.log('Attempting to connect to ThingsBoard:', config.thingsboard.baseUrl);
    
    if (!config.thingsboard.username || !config.thingsboard.password) {
      throw new Error('ThingsBoard credentials not configured. Please check your .env file');
    }

    const response = await axios.post(`${config.thingsboard.baseUrl}/api/auth/login`, {
      username: config.thingsboard.username,
      password: config.thingsboard.password
    }, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data || !response.data.token) {
      throw new Error('Invalid response from ThingsBoard: No token received');
    }

    tbToken = response.data.token;
    tokenExpires = now + 50 * 60 * 1000; // 50min
    console.log('Successfully obtained ThingsBoard token');
    return tbToken;
  } catch (error) {
    console.error('ThingsBoard connection error:', {
      message: error.message,
      code: error.code,
      baseUrl: config.thingsboard.baseUrl,
      username: config.thingsboard.username ? '(set)' : '(not set)'
    });
    throw error;
  }
}

async function reconnectThingsBoardWS(io, deviceId = null, token = null) {
  if (currentWs) {
    currentWs.close();
  }
  return connectThingsBoardWS(io, deviceId, token);
}

function connectThingsBoardWS(io, deviceId = null, token = null) {
  return new Promise(async (resolve) => {
    token = token || await getTbToken();
    
    // Récupérer le device ID et token du panneau sélectionné
    const selectedDeviceId = deviceId || process.env.TB_DEVICE || config.thingsboard.deviceId;
    
    console.log('🔌 Connexion ThingsBoard établie avec:', {
      deviceId: selectedDeviceId,
      token: token,
      timestamp: new Date().toISOString()
    });
    
    const ws = new WebSocket(`wss://thingsboard.cloud/api/ws/plugins/telemetry?token=${token}`);
    currentWs = ws;
    
    // Objet pour stocker les dernières valeurs
    let latestValues = {
      temperature: null,
      humidity: null,
      luminosity1: null,
      luminosity2: null,
      luminosity3: null,
      timestamp: Date.now()
    };

    ws.on('open', () => {
      ws.send(JSON.stringify({
        tsSubCmds: [{
          entityType: "DEVICE",
          entityId: selectedDeviceId,
          scope: "LATEST_TELEMETRY",
          cmdId: 1
        }],
        historyCmds: [],
        attrSubCmds: []
      }));
      resolve(ws);
    });

    ws.on('message', async (msg) => {
      const payload = JSON.parse(msg);
      if (payload.data) {
        // Update received values
        if (payload.data.humidity) latestValues.humidity = Number(payload.data.humidity[0][1]) || null;
        if (payload.data.temperature) latestValues.temperature = Number(payload.data.temperature[0][1]) || null;
        if (payload.data.luminosity1) latestValues.luminosity1 = Number(payload.data.luminosity1[0][1]) || null;
        if (payload.data.luminosity2) latestValues.luminosity2 = Number(payload.data.luminosity2[0][1]) || null;
        if (payload.data.luminosity3) latestValues.luminosity3 = Number(payload.data.luminosity3[0][1]) || null;

        console.log("📊 Mise à jour des valeurs :", latestValues);

        // Check if all luminosity values are available
        if (latestValues.luminosity1 !== null && 
            latestValues.luminosity2 !== null && 
            latestValues.luminosity3 !== null) {
          
          console.log("✅ Toutes les valeurs sont disponibles, envoi des données");
          await insertTelemetry(latestValues);

          // Emit data to frontend via WebSocket
          if (io && typeof io.emit === 'function') {
            console.log("📡 [DEBUG] Emitting telemetry data to clients:", latestValues);
            io.emit("telemetry", latestValues);
          } else {
            console.warn("[DEBUG] Socket.IO is not initialized, unable to emit telemetry data");
          }

          // Reset values after sending
          latestValues = {
            temperature: null,
            humidity: null,
            luminosity1: null,
            luminosity2: null,
            luminosity3: null,
          };
        }
      }
    });

    ws.on('close', () => {
      console.log('WS déconnecté, reconnexion dans 5s...');
      setTimeout(() => connectThingsBoardWS(io, deviceId, token), 5000);
    });

    ws.on('error', (err) => {
      console.error('Erreur WS:', err.message);
      ws.close();
    });
  });
}

async function createDevice(name, type = 'solar_panel') {
  try {
    const token = await getTbToken();
    
    // Créer le device dans ThingsBoard
    const response = await axios.post(
      `${config.thingsboard.baseUrl}/api/device`,
      {
        name: name,
        type: type
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.data || !response.data.id || !response.data.id.id) {
      throw new Error('Invalid response from ThingsBoard when creating device');
    }

    // Récupérer les credentials du device
    const credentialsResponse = await axios.get(
      `${config.thingsboard.baseUrl}/api/device/${response.data.id.id}/credentials`,
      {
        headers: {
          'X-Authorization': `Bearer ${token}`
        }
      }
    );

    if (!credentialsResponse.data || !credentialsResponse.data.credentialsId) {
      throw new Error('Invalid response when getting device credentials');
    }

    return {
      deviceId: response.data.id.id,
      name: response.data.name,
      token: credentialsResponse.data.credentialsId
    };
  } catch (error) {
    console.error('Error creating ThingsBoard device:', error.message);
    throw error;
  }
}

module.exports = {
  getTbToken,
  connectThingsBoardWS,
  reconnectThingsBoardWS,
  createDevice
};
