const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

// Rotta /me/company
router.get('/me/company', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await req.db.query(`
      SELECT c.id, c.name, c.email1, c.email2, c.email3, c.max_devices
      FROM companies c
      JOIN users u ON u.company_id = c.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Azienda non trovata' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore durante il recupero azienda:', error);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

module.exports = router;