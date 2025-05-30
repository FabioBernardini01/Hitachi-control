// backend/routes/logout.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/logout', async (req, res) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token && req.body && req.body.token) token = req.body.token;
  if (!token && req.query && req.query.token) token = req.query.token;



  if (!token) return res.status(401).json({ message: 'Token mancante' });

  let userId;
  try {
    const decoded = jwt.decode(token); // decode, non verify!
    userId = decoded?.userId;
    if (!userId) throw new Error();
  } catch {
    return res.status(400).json({ message: 'Token non valido' });
  }

  try {
    await req.db.query('UPDATE users SET session_token = NULL WHERE id = $1', [userId]);
    res.json({ message: 'Logout effettuato' });
  } catch (err) {
    res.status(500).json({ message: 'Errore durante il logout' });
  }
});

module.exports = router;