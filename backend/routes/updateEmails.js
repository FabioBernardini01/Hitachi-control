const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { agentSockets } = require('../ws'); // importa la mappa agentSockets


router.post('/company/updateEmails', authenticateJWT, async (req, res) => {
  const { id, email1, email2, email3 } = req.body;
  if (!email1) return res.status(400).json({ message: "Email 1 obbligatoria" });
  try {
    await req.db.query(
      'UPDATE companies SET email1 = $1, email2 = $2, email3 = $3 WHERE id = $4',
      [email1, email2, email3, id]
    );
  const companyId = req.body.id;
  const agentSocket = agentSockets.get(companyId);
  if (agentSocket) {
    agentSocket.emit('company-emails-updated');
    console.log(`[WS] Inviato evento company-emails-updated all'agent della company ${companyId}`);
  }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Errore aggiornamento email" });
  }
});

module.exports = router;