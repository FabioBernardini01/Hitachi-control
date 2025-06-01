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

    if (user.enabled === false) {
      return res.status(403).json({ message: 'Utente bloccato.' });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      // Incrementa failed_attempts e blocca se >= 5
      const newAttempts = (user.failed_attempts || 0) + 1;
      let enabled = user.enabled;
      if (newAttempts >= 5) {
        enabled = false;
      }
      await db.query(
        'UPDATE users SET failed_attempts = $1, enabled = $2 WHERE username = $3',
        [newAttempts, enabled, username]
      );
      return res.status(401).json({ message: enabled ? 'Vecchia password errata.' : 'Utente bloccato per troppi tentativi.' });
    }

    // Password corretta: resetta failed_attempts e aggiorna password
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = $1, failed_attempts = 0 WHERE username = $2',
      [hashed, username]
    );
    res.json({ message: 'Password aggiornata con successo.' });
  } catch (err) {
    res.status(500).json({ message: 'Errore interno.' });
  }
});

module.exports = router;