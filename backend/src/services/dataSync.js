const { EventEmitter } = require('events');

class DataSyncService {
  constructor() {
    this.dataBuffer = new Map();
    this.emitter = new EventEmitter();
    this.SYNC_INTERVAL = 1000; // 1 seconde d'intervalle de synchronisation
  }

  // Initialise le buffer pour un panneau spécifique
  initPanelBuffer(deviceId) {
    if (!this.dataBuffer.has(deviceId)) {
      this.dataBuffer.set(deviceId, {
        temperature: null,
        windSpeed: null,
        pressure: null,
        luminosity1: null,
        luminosity2: null,
        luminosity3: null,
        timestamp: null,
        lastUpdate: Date.now()
      });
    }
  }

  // Met à jour les données dans le buffer
  updateData(deviceId, sensorType, value, timestamp) {
    this.initPanelBuffer(deviceId);
    const panelData = this.dataBuffer.get(deviceId);
    panelData[sensorType] = value;
    panelData.timestamp = timestamp || Date.now();
    panelData.lastUpdate = Date.now();

    // Vérifie si toutes les données sont présentes
    this.checkComplete(deviceId);
  }

  // Vérifie si toutes les données sont présentes et synchronisées
  checkComplete(deviceId) {
    const panelData = this.dataBuffer.get(deviceId);
    const requiredSensors = ['temperature', 'windSpeed', 'pressure', 'luminosity1', 'luminosity2', 'luminosity3'];
    
    // Vérifie si toutes les données sont présentes
    const isComplete = requiredSensors.every(sensor => panelData[sensor] !== null);
    
    if (isComplete) {
      // Vérifie si les données sont récentes (moins de SYNC_INTERVAL ms)
      const now = Date.now();
      const isRecent = (now - panelData.lastUpdate) < this.SYNC_INTERVAL;

      if (isRecent) {
        // Émet les données complètes
        const completeData = {...panelData};
        this.emitter.emit('data-complete', deviceId, completeData);
        
        // Réinitialise le buffer pour ce panneau
        this.dataBuffer.set(deviceId, {
          temperature: null,
          windSpeed: null,
          pressure: null,
          luminosity1: null,
          luminosity2: null,
          luminosity3: null,
          timestamp: null,
          lastUpdate: now
        });
      }
    }
  }

  // S'abonne aux données complètes
  onComplete(callback) {
    this.emitter.on('data-complete', callback);
  }
}

const dataSyncService = new DataSyncService();
module.exports = dataSyncService;
