const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    await req.db.query('UPDATE users SET session_token = NULL WHERE id = $1', [req.user.userId]);
    res.json({ message: 'Logout effettuato' });
  } catch (err) {
    res.status(500).json({ message: 'Errore durante il logout' });
  }
});

module.exports = router;