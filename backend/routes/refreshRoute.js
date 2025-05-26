const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const refreshTokens = require('./login').refreshTokens;

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens[refreshToken]) {
    return res.status(403).json({ message: 'Refresh token non valido' });
  }

  const userId = refreshTokens[refreshToken];
  // Recupera user dal DB per company_id!
  const result = await req.db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ message: 'Utente non trovato' });

  // AGGIUNGI company_id nel token!
  const token = jwt.sign(
    { userId: user.id, company_id: user.company_id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  res.json({ token });
});

module.exports = router;