const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize('solarPanel', 'postgres', 'postgres', {
    host: 'localhost',
    dialect: 'postgres',
});

const clientConnections = new Map();

function setupWebSocketServer(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', async (ws, req) => {
        let clientId = null;
        let deviceId = null;

        try {
            const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
            if (!token) {
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    message: 'Token JWT manquant. Veuillez fournir un token valide dans l\'URL.'
                }));
                ws.close(4001, 'Token JWT manquant');
                return;
            }

            const decoded = jwt.verify(token, config.jwtSecret);
            clientId = decoded.userId;

            console.log('🔌 Nouveau client connecté:', {
                clientId,
                timestamp: new Date().toISOString()
            });

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);

                    if (data.type === 'SELECT_PANEL') {
                        const [result] = await sequelize.query(
                            `SELECT device_id_thingsboard FROM solar_panel WHERE name = :panelName`,
                            {
                                replacements: { panelName: data.panelName },
                                type: Sequelize.QueryTypes.SELECT,
                            }
                        );

                        if (!result) {
                            throw new Error(`Panneau non trouvé: ${data.panelName}`);
                        }

                        deviceId = result.device_id_thingsboard;

                        clientConnections.set(`${clientId}-${deviceId}`, {
                            ws,
                            clientId,
                            deviceId,
                            panelName: data.panelName
                        });

                        console.log('✅ Client associé au panneau:', {
                            clientId,
                            deviceId,
                            panelName: data.panelName
                        });

                        ws.send(JSON.stringify({
                            type: 'PANEL_SELECTED',
                            success: true,
                            panelName: data.panelName
                        }));
                    }
                } catch (error) {
                    console.error('❌ Erreur lors du traitement du message:', error);
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: error.message
                    }));
                }
            });

            ws.on('close', () => {
                if (clientId && deviceId) {
                    clientConnections.delete(`${clientId}-${deviceId}`);
                    console.log('🔴 Client déconnecté:', {
                        clientId,
                        deviceId,
                        timestamp: new Date().toISOString()
                    });
                }
            });

        } catch (error) {
            console.error('❌ Erreur de connexion WebSocket:', error);
            ws.close();
        }
    });
}

module.exports = {
    setupWebSocketServer,
    broadcastTelemetry: (deviceId, telemetryData) => {
        for (const [key, connection] of clientConnections.entries()) {
            if (connection.deviceId === deviceId) {
                try {
                    connection.ws.send(JSON.stringify({
                        type: 'TELEMETRY_UPDATE',
                        data: telemetryData
                    }));
                } catch (error) {
                    console.error(`❌ Erreur lors de l'envoi au client ${connection.clientId}:`, error);
                }
            }
        }
    }
};
