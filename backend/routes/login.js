const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // <
const router = express.Router();


const refreshTokens = {}; // <--- aggiungi questa riga

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await req.db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Username o password errati' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: 'Username o password errati' });
    }

    const token = jwt.sign(
      { userId: user.id, company_id: user.company_id },
      process.env.JWT_SECRET,
      { expiresIn: '1m' }
    );
 // Genera refresh token
  const refreshToken = crypto.randomBytes(64).toString('hex');
  refreshTokens[refreshToken] = user.id; // Salva in memoria (usa DB in prod)

  return res.json({ token, refreshToken });
  } catch (error) {
    console.error('Errore durante la login:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

module.exports = { router, refreshTokens }; 
