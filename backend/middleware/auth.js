const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');



const JWT_SECRET = process.env.JWT_SECRET || 'supersegreto'; // fallback utile per dev

function authenticateJWT(req, res, next) {

  
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token non valido' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: 'Token mancante' });
  }
}

module.exports = { authenticateJWT };
