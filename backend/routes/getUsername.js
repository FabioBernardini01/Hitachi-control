const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

// Rotta /me/username
router.get('/me/username', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await req.db.query(`
      SELECT username
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    res.json({ username: result.rows[0].username });
  } catch (error) {
    console.error('Errore durante il recupero del nome utente:', error);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

module.exports = router;