// pg.js (o db.js)
const { Client } = require('pg');
// Crea una nuova connessione al database
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Connessione al database
client.connect()
  .then(() => console.log('✅ Connessione al database PostgreSQL riuscita'))
  .catch(err => console.error('❌ Errore nella connessione al DB:', err));

// Esporta il client per essere utilizzato in altre parti dell'app
module.exports = client;
