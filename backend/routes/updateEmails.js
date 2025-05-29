const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const agentSockets = require('../agentSockets');
// ...poi usa agentSockets.get(companyId)...

router.post('/company/updateEmails', authenticateJWT, async (req, res) => {
  const { id, email1, email2, email3 } = req.body;
  try {
    await req.db.query(
      `UPDATE companies SET email1 = $1, email2 = $2, email3 = $3 WHERE id = $4`,
      [email1, email2, email3, id]
    );
    // Prova a notificare l'agent, ma non bloccare la risposta se fallisce
    try {
      const agentSocket = agentSockets.get(id);
      if (agentSocket && agentSocket.connected) {
        agentSocket.emit('company-emails-updated');
        console.log(`[WS] Evento company-emails-updated inviato all'agent della company ${id}`);
      } else {
        console.log(`[WS] Nessun agent collegato per company ${id}, nessun evento inviato`);
      }
    } catch (wsErr) {
      console.error(`[WS] Errore invio evento a agent company ${id}:`, wsErr);
      // NON rilanciare errore!
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Errore updateEmails:', err);
    res.status(500).json({ message: "Errore aggiornamento email", error: err.message });
  }
});

module.exports = router;