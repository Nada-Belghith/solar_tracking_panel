const { Pool } = require('pg');
const config = require('../config');
const { createDevice } = require('./thingsboard');

const pool = new Pool({
  connectionString: config.db.url || 'postgresql://postgres@localhost:5432/solarpanel'
});

pool.on('error', err => console.error('Idle client error', err));

const query = (text, params) => pool.query(text, params);

const insertClient = async (clientData, userId) => {
  const {
    name,
    cin,
    email,
    address,
    installationDate,
    latitude,
    longitude,
    elevation
  } = clientData;

  const queryText = `
    INSERT INTO clients (
      name,
      cin,
      email,
      address,
      installation_date,
      status,
      latitude,
      longitude,
      elevation,
      user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, name, cin, status`;

  try {
    // Démarrer une transaction
    await query('BEGIN');

    // Insérer le client
    const result = await query(queryText, [
      name,
      cin,
      email,
      address,
      installationDate,
      'en attente',
      latitude,
      longitude,
      elevation,
      userId
    ]);

    const clientId = result.rows[0].id;
    
    // Créer le device dans ThingsBoard
    const deviceName = `PV_${name}`;
    const tbDevice = await createDevice(deviceName, 'solar_panel');
    
    // Créer l'entrée dans la table solar_panel
    const panelQueryText = `
      INSERT INTO solar_panel (
        client_id,
        device_id_thingsboard,
        token_thingsboard,
        name
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, name`;

    await query(panelQueryText, [
      clientId,
      tbDevice.deviceId,
      tbDevice.token,
      deviceName
    ]);

    // Valider la transaction
    await query('COMMIT');
    return result.rows[0];
  } catch (error) {
    // En cas d'erreur, annuler la transaction
    await query('ROLLBACK');
    console.error('Erreur lors de l\'insertion du client et du panneau:', error);
    throw new Error(
      error.code === '23505' && error.constraint === 'clients_cin_key'
        ? 'Un client avec ce CIN existe déjà'
        : 'Erreur lors de l\'ajout du client'
    );
  }
};

module.exports = {
  query,
  insertClient
};
