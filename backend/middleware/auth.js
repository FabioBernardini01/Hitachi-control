const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, async (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token non valido' });
      }
      try {
        // Recupera anche il campo enabled
        const result = await req.db.query(
          'SELECT session_token, enabled FROM users WHERE id = $1',
          [user.userId]
        );
        if (!result.rows.length || result.rows[0].session_token !== token) {
          return res.status(401).json({ message: 'Sessione non più valida (riprova fra 1 minuto)' });
        }
        if (result.rows[0].enabled === false) {
          return res.status(403).json({ message: 'Utente disabilitato' });
        }
        req.user = user;
        await req.db.query(
        'UPDATE users SET last_seen = NOW() WHERE id = $1',
        [user.userId]
        );
        next();
      } catch (e) {
        return res.status(500).json({ message: 'Errore autenticazione' });
      }
    });
  } else {
    return res.status(401).json({ message: 'Token mancante' });
  }
}

module.exports = { authenticateJWT };