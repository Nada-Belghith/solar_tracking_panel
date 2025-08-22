const { Sequelize } = require('sequelize');
const { connectThingsBoardWS } = require('./thingsboard');

const sequelize = new Sequelize('solarPanel', 'postgres', 'postgres', {
    host: 'localhost',
    dialect: 'postgres',
});

async function initializeWebSockets() {
    try {
        // Récupérer tous les panneaux configurés
        const configuredPanels = await sequelize.query(
            `SELECT device_id_thingsboard, token_thingsboard FROM solar_panel WHERE state = 'configure'`,
            {
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        console.log(`🔄 Initialisation des WebSockets pour ${configuredPanels.length} panneaux configurés`);

        // Établir les connexions WebSocket pour chaque panneau
        for (const panel of configuredPanels) {
            try {
                await connectThingsBoardWS(null, panel.device_id_thingsboard, panel.token_thingsboard);
                console.log(`✅ WebSocket initialisé pour le device ${panel.device_id_thingsboard}`);
            } catch (err) {
                console.error(`❌ Erreur lors de l'initialisation du WebSocket pour le device ${panel.device_id_thingsboard}:`, err.message);
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des WebSockets:', error);
    }
}

module.exports = {
    initializeWebSockets
};
