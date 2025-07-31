const axios = require('axios');
const WebSocket = require('ws');
const config = require('../config');
const { insertTelemetry } = require('./telemetry');
const { Sequelize, DataTypes } = require('sequelize');

let tbToken = null;
let tokenExpires = 0;
let currentWs = null;
const activeConnections = new Map(); // Map pour gérer les connexions par deviceId


const sequelize = new Sequelize('solarPanel', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
});
// Define the telemetry model dynamically
function defineTelemetryModel(panelName) {
  const tableName = `telemetries_${panelName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  return sequelize.define(tableName, {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    temperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    humidity: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    luminosity1: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    luminosity2: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    luminosity3: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
  }, {
    tableName,
    timestamps: false,
  });
}

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

async function isDeviceActive(deviceId) {
  try {
    const token = await getTbToken();
    const url = `${config.thingsboard.baseUrl}/api/device/${deviceId}/status`;
    console.log(`🔍 Vérification de l'état du device avec l'URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'X-Authorization': `Bearer ${token}`,
      },
      timeout: 20000 // Augmenter le délai d'attente à 20 secondes
    });

    return response.data && response.data.status === 'ACTIVE';
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification de l'état du device ${deviceId}:`, {
      message: error.message,
      response: error.response ? error.response.data : 'Pas de réponse',
      status: error.response ? error.response.status : 'Statut inconnu'
    });
    return false;
  }
}

async function reconnectThingsBoardWS(io, deviceId = null, token = null) {
  // Fermer la connexion WebSocket existante s'il y en a une
  if (activeConnections.has(deviceId)) {
    console.log(`🔴 Fermeture de la connexion WebSocket existante pour le deviceId ${deviceId}`);
    activeConnections.get(deviceId).close();
    activeConnections.delete(deviceId);
  }
  
  return connectThingsBoardWS(io, deviceId, token);
}

function connectThingsBoardWS(io, deviceId, token) {
  return new Promise(async (resolve) => {
    // Vérifier si une WebSocket existe déjà pour ce deviceId
    if (activeConnections.has(deviceId)) {
      console.warn(`⚠️ Une WebSocket existe déjà pour le device ${deviceId}.`);
      return resolve(activeConnections.get(deviceId));
    }

    // Obtenir le token JWT pour l'authentification WebSocket
    const jwtToken = await getTbToken();
    const deviceToken = token; // Conserver le token du device pour l'identification

    console.log('🔌 Connexion ThingsBoard établie avec:', {
      deviceId,
      deviceToken,
      timestamp: new Date().toISOString(),
    });

    // Utiliser le JWT token pour la connexion WebSocket
    const ws = new WebSocket(`wss://thingsboard.cloud/api/ws/plugins/telemetry?token=${jwtToken}`);
    activeConnections.set(deviceId, ws); // Associer la WebSocket à l'ID du device

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          tsSubCmds: [
            {
              entityType: 'DEVICE',
              entityId: deviceId,
              scope: 'LATEST_TELEMETRY',
              cmdId: 1,
            },
          ],
          historyCmds: [],
          attrSubCmds: [],
        })
      );
      resolve(ws);
    });

    ws.on('message', async (msg) => {
      console.log('📥 Message reçu de ThingsBoard:', msg);
      const payload = JSON.parse(msg);

      if (payload.data) {
        console.log('📦 Données brutes reçues:', payload.data);

        // Récupérer le nom du panneau depuis la base de données
        try {
            const [result] = await sequelize.query(
                `SELECT name FROM solar_panel WHERE device_id_thingsboard = :deviceId`,
                {
                    replacements: { deviceId },
                    type: Sequelize.QueryTypes.SELECT,
                }
            );

            if (!result) {
                throw new Error(`Aucun panneau trouvé pour le deviceId ${deviceId}`);
            }

            const { name: panelName } = result;
            
            // Insérer les données dans la table correspondante
            const TelemetryModel = defineTelemetryModel(panelName);
          await TelemetryModel.create({
            temperature: payload.data.temperature ? Number(payload.data.temperature[0][1]) : null,
            humidity: payload.data.humidity ? Number(payload.data.humidity[0][1]) : null,
            luminosity1: payload.data.luminosity1 ? Number(payload.data.luminosity1[0][1]) : null,
            luminosity2: payload.data.luminosity2 ? Number(payload.data.luminosity2[0][1]) : null,
            luminosity3: payload.data.luminosity3 ? Number(payload.data.luminosity3[0][1]) : null,
          });
          console.log(`✅ Données insérées dans la table pour le device ${deviceId}`);
        } catch (err) {
          console.error(`❌ Erreur lors de l'insertion des données pour le device ${deviceId}:`, err.message);
        }
      }
    });

    ws.on('close', async (code, reason) => {
      console.log(`WS déconnecté avec code ${code} et raison: ${reason}`);
      activeConnections.delete(deviceId); // Supprimer la connexion active

      console.log('Reconnexion dans 10s...');
      setTimeout(() => {
        connectThingsBoardWS(io, deviceId, token).catch(console.error);
      }, 10000);
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

    // Créer une table de télémétrie pour le device
    try {
      await createTelemetryTable(name);
      console.log(`✅ Table de télémétrie créée automatiquement pour le device: ${name}`);
    } catch (err) {
      console.error(`❌ Erreur lors de la création de la table de télémétrie pour le device ${name}:`, err.message);
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

async function createTelemetryTable(panelName) {
  if (!panelName || typeof panelName !== 'string') {
    console.error('❌ Nom du panneau invalide pour la création de la table:', panelName);
    throw new Error('Nom du panneau invalide');
  }

  try {
    console.log(`🛠️ Tentative de création de la table pour le panneau ${panelName} avec Sequelize...`);
    const TelemetryModel = defineTelemetryModel(panelName);
    await TelemetryModel.sync(); // Synchronize the model with the database
    console.log(`✅ Table de télémétrie créée ou déjà existante pour le panneau: ${panelName}`);
  } catch (err) {
    console.error(`❌ Erreur lors de la création de la table pour le panneau ${panelName}:`, err.message);
    throw err;
  }
}

async function insertTelemetryForPanel(panelName, data) {
  if (!panelName || typeof panelName !== 'string') {
    console.error('❌ Nom du panneau invalide pour l\'insertion des télémétries:', panelName);
    throw new Error('Nom du panneau invalide');
  }

  if (!data || typeof data !== 'object') {
    console.error('❌ Données de télémétrie invalides:', data);
    throw new Error('Données de télémétrie invalides');
  }

  const TelemetryModel = defineTelemetryModel(panelName);
  try {
    console.log(`🛠️ Insertion des données dans la table ${TelemetryModel.tableName}...`);
    await TelemetryModel.create({
      temperature: data.temperature || null,
      humidity: data.humidity || null,
      luminosity1: data.luminosity1 || null,
      luminosity2: data.luminosity2 || null,
      luminosity3: data.luminosity3 || null,
    });
    console.log(`✅ Télémétrie insérée dans la table ${TelemetryModel.tableName}`);
  } catch (err) {
    console.error(`❌ Erreur lors de l'insertion dans la table ${TelemetryModel.tableName}:`, err.message);
    throw err;
  }
}

async function configureDevice(deviceId) {
  try {
    // Mettre à jour l'état du device dans la base de données
    const result = await sequelize.query(
      `UPDATE solar_panel SET state = 'configuré' WHERE device_id_thingsboard = :deviceId RETURNING *`,
      {
        replacements: { deviceId },
        type: Sequelize.QueryTypes.UPDATE,
      }
    );

    if (result[1] === 0) {
      console.warn(`⚠️ Aucun device trouvé avec l'ID ${deviceId} pour la configuration.`);
      return;
    }

    console.log(`✅ Device ${deviceId} configuré avec succès.`);

    // Établir une connexion WebSocket avec ThingsBoard
    console.log(`🔧 Établissement de la connexion WebSocket pour le device configuré: ${deviceId}`);
    await connectThingsBoardWS(null, deviceId, null);
  } catch (error) {
    console.error(`❌ Erreur lors de la configuration du device ${deviceId}:`, error.message);
  }
}

module.exports = {
  getTbToken,
  connectThingsBoardWS,
  reconnectThingsBoardWS,
  createDevice,
  createTelemetryTable,
  insertTelemetryForPanel,
  configureDevice
};
