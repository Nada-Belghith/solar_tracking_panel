const express = require('express');
const router = express.Router();
const { insertClient } = require('../services/db');
const auth = require('../middleware/auth');

// Route pour ajouter un nouveau client
router.post('/', auth, async (req, res) => {
  try {
    const newClient = await insertClient(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'Client ajouté avec succès',
      data: newClient
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
