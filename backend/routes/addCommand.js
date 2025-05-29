const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const agentSockets = require('../agentSockets');

// Un utente FE/BE accoda un comando per una stampante
router.post('/commands/add', authenticateJWT, async (req, res) => {
  const { printer_id, type, payload } = req.body;
  const companyId = req.user.company_Id;
  if (!printer_id || !type || !payload) {
    return res.status(400).json({ error: 'Dati comando mancanti' });
  }
  try {
    await req.db.query(
      `INSERT INTO commands (company_id, printer_id, type, payload, status) VALUES ($1, $2, $3, $4, 'pending')`,
      [companyId, printer_id, type, JSON.stringify(payload)]
    );
   
const agentSocket = agentSockets.get(companyId);
if (agentSocket && agentSocket.connected) {
  agentSocket.emit('execute-commands');
  console.log(`[WS] Evento execute-commands inviato all'agent della company ${companyId}`);
}
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore accodamento comando' });
  }
});

module.exports = router;