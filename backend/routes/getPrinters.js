const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

// Rotta per ottenere le stampanti
router.get('/printers', authenticateJWT, async (req, res) => {
  try {
    const db = req.db;
    const companyId = req.user.company_id;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID mancante nel token' });
    }

    const query = 'SELECT * FROM printers WHERE company_id = $1';
    const values = [companyId];
    const result = await db.query(query, values);

    // Restituisci sempre 200 e un array (anche vuoto)
    res.json(result.rows);

  } catch (error) {
    console.error('Errore nel recupero delle stampanti:', error);
    res.status(500).json({ error: 'Errore nel recupero delle stampanti' });
  }
});

module.exports = router;