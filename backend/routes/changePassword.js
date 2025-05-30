const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

router.post('/change-password', async (req, res) => {
  const { username, oldPassword, newPassword, confirmPassword } = req.body;
  if (!username || !oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Tutti i campi sono obbligatori.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Le nuove password non coincidono.' });
  }
  try {
    const db = req.db || req.app.get('db');
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Utente non trovato.' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Vecchia password errata.' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE username = $2', [hashed, username]);
    res.json({ message: 'Password aggiornata con successo.' });
  } catch (err) {
    res.status(500).json({ message: 'Errore interno.' });
  }
});

module.exports = router;