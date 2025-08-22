const axios = require('axios');
const WebSocket = require('ws');
const config = require('../config');
const { Sequelize, DataTypes } = require('sequelize');
const { broadcastTelemetry } = require('./clientWebSocket');

const activeConnections = new Map(); // Map pour gérer les connexions par deviceId
let tbToken = null;
let tokenExpires = 0;

const sequelize = new Sequelize('solarPanel', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
});

// ──────────────────────────────
// Définition dynamique du modèle
// ──────────────────────────────
function defineTelemetryModel(panelName) {
  const tableName = `telemetries_${panelName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  return sequelize.define(tableName, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    temperature: { type: DataTypes.FLOAT, allowNull: true },
    luminosity1: { type: DataTypes.FLOAT, allowNull: true },
    luminosity2: { type: DataTypes.FLOAT, allowNull: true },
    luminosity3: { type: DataTypes.FLOAT, allowNull: true },
    pressure: { type: DataTypes.FLOAT, allowNull: true },
    windSpeed: { type: DataTypes.FLOAT, allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  }, {
    tableName,
    timestamps: false,
  });
}

// ──────────────────────────────
// Récupération du token ThingsBoard
// ──────────────────────────────
async function getTbToken() {
  const now = Date.now();
  if (tbToken && now < tokenExpires) {
    return tbToken;
  }

  if (!config.thingsboard.username || !config.thingsboard.password) {
    throw new Error('ThingsBoard credentials not configured');
  }

  const response = await axios.post(`${config.thingsboard.baseUrl}/api/auth/login`, {
    username: config.thingsboard.username,
    password: config.thingsboard.password
  }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });

  if (!response.data || !response.data.token) {
    throw new Error('No token received from ThingsBoard');
  }

  tbToken = response.data.token;
  tokenExpires = now + 50 * 60 * 1000; // 50 min
  return tbToken;
}

// ──────────────────────────────
// Gestion WebSocket ThingsBoard
// ──────────────────────────────
async function connectThingsBoardWS(io, deviceId, token = null) {
  return new Promise(async (resolve) => {
    if (activeConnections.has(deviceId)) {
      const existingWs = activeConnections.get(deviceId);
      if (io) existingWs._io = io;
      return resolve(existingWs);
    }

    const jwtToken = await getTbToken();
    const ws = new WebSocket(`wss://thingsboard.cloud/api/ws/plugins/telemetry?token=${jwtToken}`);
    activeConnections.set(deviceId, ws);
    ws._io = io;

    ws.on('open', () => {
      ws.send(JSON.stringify({
        tsSubCmds: [{ entityType: 'DEVICE', entityId: deviceId, scope: 'LATEST_TELEMETRY', cmdId: 1 }],
        historyCmds: [],
        attrSubCmds: [],
      }));
      resolve(ws);
    });

    // Buffer temporaire par device
    const telemetryBuffer = new Map();

    ws.on('message', async (msg) => {
      const payload = JSON.parse(msg);
      if (!payload.data) return;

      try {
        const [result] = await sequelize.query(
          `SELECT name FROM solar_panel WHERE device_id_thingsboard = :deviceId`,
          {
            replacements: { deviceId },
            type: Sequelize.QueryTypes.SELECT,
          }
        );

        if (!result) throw new Error(`Aucun panneau trouvé pour le deviceId ${deviceId}`);
        const { name: panelName } = result;

        // --- récupérer ou init buffer
        if (!telemetryBuffer.has(deviceId)) {
          telemetryBuffer.set(deviceId, { data: {}, timeout: null });
        }
        const buffer = telemetryBuffer.get(deviceId);

        // --- merge nouvelles données
        for (const key of Object.keys(payload.data)) {
          buffer.data[key] = payload.data[key][0][1];
          buffer.data.timestamp = new Date(payload.data[key][0][0]).toISOString();
        }

        // --- (re)planifier flush
        if (buffer.timeout) clearTimeout(buffer.timeout);
        buffer.timeout = setTimeout(async () => {
          const telemetryData = {
            panelId: deviceId,
            name: panelName,
            data: {
              temperature: buffer.data.temperature ?? null,
              windSpeed: buffer.data.windSpeed ?? null,
              pressure: buffer.data.pressure ?? null,
              luminosity1: buffer.data.luminosity1 ?? null,
              luminosity2: buffer.data.luminosity2 ?? null,
              luminosity3: buffer.data.luminosity3 ?? null,
              timestamp: buffer.data.timestamp ?? new Date().toISOString(),
            },
          };

          // 👉 Diffusion front
          if (ws._io) ws._io.to(deviceId).emit(`telemetry:${deviceId}`, telemetryData);
          broadcastTelemetry(deviceId, telemetryData);

          // 👉 Insertion DB (une seule ligne regroupée)
          const TelemetryModel = defineTelemetryModel(panelName);
          await TelemetryModel.create({
            temperature: telemetryData.data.temperature,
            luminosity1: telemetryData.data.luminosity1,
            luminosity2: telemetryData.data.luminosity2,
            luminosity3: telemetryData.data.luminosity3,
            pressure: telemetryData.data.pressure,
            windSpeed: telemetryData.data.windSpeed,
            timestamp: new Date(telemetryData.data.timestamp),
          });

          // clear buffer
          telemetryBuffer.delete(deviceId);
        }, 200); // flush après 200 ms
      } catch (err) {
        console.error(`Erreur traitement télémétrie device ${deviceId}:`, err.message || err);
      }
    });

    ws.on('close', () => {
      activeConnections.delete(deviceId);
      setTimeout(() => connectThingsBoardWS(io, deviceId, token).catch(console.error), 10000);
    });

    ws.on('error', (err) => {
      console.error('WS error:', err.message);
      ws.close();
    });
  });
}

// ──────────────────────────────
// Création device + table télémétrie
// ──────────────────────────────
async function createDevice(name, type = 'solar_panel') {
  try {
    const token = await getTbToken();

    const response = await axios.post(
      `${config.thingsboard.baseUrl}/api/device`,
      { name, type },
      { headers: { 'X-Authorization': `Bearer ${token}` } }
    );

    const deviceId = response.data.id.id;

    const credentialsResponse = await axios.get(
      `${config.thingsboard.baseUrl}/api/device/${deviceId}/credentials`,
      { headers: { 'X-Authorization': `Bearer ${token}` } }
    );

    await createTelemetryTable(name);

    return { deviceId, name: response.data.name, token: credentialsResponse.data.credentialsId };
  } catch (err) {
    console.error('Error creating ThingsBoard device:', err.message);
    throw err;
  }
}

async function createTelemetryTable(panelName) {
  const TelemetryModel = defineTelemetryModel(panelName);
  await TelemetryModel.sync();
}

// ──────────────────────────────
// Insertion télémétrie manuelle
// ──────────────────────────────
async function insertTelemetryForPanel(panelName, data) {
  const TelemetryModel = defineTelemetryModel(panelName);
  await TelemetryModel.create({
    temperature: data.temperature ?? null,
    luminosity1: data.luminosity1 ?? null,
    luminosity2: data.luminosity2 ?? null,
    luminosity3: data.luminosity3 ?? null,
    pressure: data.pressure ?? null,
    windSpeed: data.windSpeed ?? null,
  });
}

// ──────────────────────────────
// Configurer device (DB + WS)
// ──────────────────────────────
async function configureDevice(deviceId) {
  const result = await sequelize.query(
    `UPDATE solar_panel SET state = 'configure' WHERE device_id_thingsboard = :deviceId RETURNING *`,
    { replacements: { deviceId }, type: Sequelize.QueryTypes.UPDATE }
  );

  if (result[1] === 0) {
    console.warn(`Aucun device trouvé avec l'ID ${deviceId}`);
    return;
  }

  await connectThingsBoardWS(null, deviceId, null);
}

// ──────────────────────────────
// Export
// ──────────────────────────────
module.exports = {
  getTbToken,
  connectThingsBoardWS,
  createDevice,
  createTelemetryTable,
  insertTelemetryForPanel,
  configureDevice
};
