const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

const refreshTokens = {};

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await req.db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Username inesistente' });
    }

    // Controllo se utente disabilitato o bloccato
    if (user.enabled === false) {
      return res.status(403).json({ message: 'Utente disabilitato' });
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ message: 'Account bloccato per troppi tentativi. Riprova dopo: ' + user.locked_until });
    }

    // ---- LOGICA SPECIALE AGENT ----
    if (user.agent && user.session_token) {
      // Se è passato meno di 1 minuto dall'ultimo forced login, incrementa il contatore
      const now = new Date();
      let forcedCount = user.agent_login_forced_count || 0;
      let lastForced = user.agent_login_forced_last ? new Date(user.agent_login_forced_last) : null;
      if (lastForced && (now - lastForced) < 60 * 1000) {
        forcedCount += 1;
      } else {
        forcedCount = 1;
      }

      // Se supera la soglia, disabilita l'utenza
      if (forcedCount >= 10) {
        await req.db.query(
          'UPDATE users SET enabled = false, agent_login_forced_count = $1, agent_login_forced_last = $2 WHERE id = $3',
          [forcedCount, now, user.id]
        );
        return res.status(403).json({ message: 'Utente agent disabilitato per troppi forced login.' });
      }

      // Aggiorna contatore e timestamp
      await req.db.query(
        'UPDATE users SET session_token = NULL, agent_login_forced_count = $1, agent_login_forced_last = $2 WHERE id = $3',
        [forcedCount, now, user.id]
      );
      // Restituisci errore per far riloggare l'agent
      return res.status(403).json({ message: 'Sessione agent forzatamente liberata. Riprova login.' });
    }

    // BLOCCO LOGIN MULTIPLO: se session_token presente, rifiuta login
    if (user.session_token) {
      return res.status(403).json({ message: 'Sessione già attiva altrove. Effettua logout dalla sessione precedente (se possibile) oppure attendi un minuto se inattiva e irrecuperabile (scheda chiusa)' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      // Incrementa tentativi falliti
      let failedAttempts = (user.failed_attempts || 0) + 1;
      let lockedUntil = null;
      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore
        await req.db.query(
          'UPDATE users SET failed_attempts = $1, locked_until = $2 WHERE id = $3',
          [failedAttempts, lockedUntil, user.id]
        );
        return res.status(403).json({ message: 'Account bloccato per 24 ore per troppi tentativi.' });
      } else {
        await req.db.query(
          'UPDATE users SET failed_attempts = $1 WHERE id = $2',
          [failedAttempts, user.id]
        );
        return res.status(401).json({ message: `Username o password errati. Tentativi rimasti: ${5 - failedAttempts}` });
      }
    }

    // Login riuscito: resetta tentativi falliti
    await req.db.query(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id, company_id: user.company_id },
      process.env.JWT_SECRET,
      { expiresIn: '1m' }
    );
    // Genera refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    refreshTokens[refreshToken] = user.id; // Salva in memoria (usa DB in prod)

    // Salva il token attivo nel DB per l'utente
    await req.db.query(
      'UPDATE users SET session_token = $1 WHERE id = $2',
      [token, user.id]
    );

    return res.json({ token, refreshToken });
  } catch (error) {
    console.error('Errore durante la login:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

module.exports = { router, refreshTokens };