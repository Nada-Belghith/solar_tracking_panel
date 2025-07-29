const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.db.url || 'postgresql://postgres@localhost:5432/solarpanel'
});

async function insertTelemetry({ humidity = null, temperature = null, luminosity1 = null, luminosity2 = null, luminosity3 = null }) {
  try {
    await pool.query(
      `INSERT INTO telemetry (humidity, temperature, luminosity1, luminosity2, luminosity3, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [humidity, temperature, luminosity1, luminosity2, luminosity3]
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
