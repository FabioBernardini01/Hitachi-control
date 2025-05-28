const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

// L'agent invia il risultato di un comando
router.post('/agent/command-result', authenticateJWT, async (req, res) => {
  const { commandId, success, error, data } = req.body;
  try {
    await req.db.query(
      `UPDATE commands SET status = $1, result = $2, executed_at = NOW() WHERE id = $3`,
      [success ? 'executed' : 'error', JSON.stringify({ error, data }), commandId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore nel salvataggio risultato comando' });
  }
});

module.exports = router;