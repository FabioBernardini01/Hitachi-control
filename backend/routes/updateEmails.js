const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

router.post('/company/updateEmails', authenticateJWT, async (req, res) => {
  const { id, email1, email2, email3 } = req.body;
  if (!email1) return res.status(400).json({ message: "Email 1 obbligatoria" });
  try {
    await req.db.query(
      'UPDATE companies SET email1 = $1, email2 = $2, email3 = $3 WHERE id = $4',
      [email1, email2, email3, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Errore aggiornamento email" });
  }
});

module.exports = router;