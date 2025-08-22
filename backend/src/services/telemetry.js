const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.db.url || 'postgresql://postgres@localhost:5432/solarpanel'
});

async function insertTelemetry({ temperature = null, luminosity1 = null, luminosity2 = null, luminosity3 = null, pressure = null, windSpeed = null }) {
  try {
    await pool.query(
      `INSERT INTO telemetry (temperature, luminosity1, luminosity2, luminosity3, pressure, windSpeed, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [temperature, luminosity1, luminosity2, luminosity3, pressure, windSpeed]
    );
    console.log('✅ Télémétrie insérée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion de la télémétrie:', error);
    throw error;
  }
}

module.exports = {
  insertTelemetry
};
