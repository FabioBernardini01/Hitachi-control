// pg.js (o db.js)
const { Client } = require('pg');
// Crea una nuova connessione al database
const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

// Connessione al database
client.connect()
  .then(() => console.log('✅ Connessione al database PostgreSQL riuscita'))
  .catch(err => console.error('❌ Errore nella connessione al DB:', err));

// Esporta il client per essere utilizzato in altre parti dell'app
module.exports = client;
