const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

router.post('/update-last-seen', authenticateJWT, async (req, res) => {
  try {
    await req.db.query(
      'UPDATE users SET last_seen = NOW() WHERE id = $1',
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Errore aggiornamento last_seen' });
  }
});

module.exports = router;