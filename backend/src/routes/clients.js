const express = require('express');
const router = express.Router();
const { insertClient } = require('../services/db');
const auth = require('../middleware/auth');

// Route pour ajouter un nouveau client
router.post('/clients', auth, async (req, res) => {
  try {
    console.log('📥 Données reçues pour ajouter un client:', req.body);
    console.log('👤 Utilisateur authentifié ID:', req.user.id);

    const newClient = await insertClient(req.body, req.user.id);

    console.log('✅ Client ajouté avec succès:', newClient);
    res.status(201).json({
      success: true,
      message: 'Client ajouté avec succès',
      data: newClient
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du client:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
