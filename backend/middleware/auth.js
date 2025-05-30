const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const JWT_SECRET = process.env.JWT_SECRET || 'supersegreto';

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, async (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token non valido' });
      }
      // Verifica che il token sia quello attivo per l'utente
      try {
        const db = req.db || req.app.get('db');
        const result = await db.query('SELECT session_token FROM users WHERE id = $1', [user.userId]);
        if (!result.rows.length || result.rows[0].session_token !== token) {
          return res.status(401).json({ message: 'Sessione non più valida (login effettuato altrove o logout)' });
        }
      } catch (e) {
        return res.status(500).json({ message: 'Errore verifica sessione' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: 'Token mancante' });
  }
}

module.exports = { authenticateJWT };