const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

// Un utente FE/BE accoda un comando per una stampante
router.post('/commands/add', authenticateJWT, async (req, res) => {
  const { printer_id, type, payload } = req.body;
  const companyId = req.user.companyId;
  if (!printer_id || !type || !payload) {
    return res.status(400).json({ error: 'Dati comando mancanti' });
  }
  try {
    await req.db.query(
      `INSERT INTO commands (company_id, printer_id, type, payload, status) VALUES ($1, $2, $3, $4, 'pending')`,
      [companyId, printer_id, type, JSON.stringify(payload)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore accodamento comando' });
  }
});

module.exports = router;