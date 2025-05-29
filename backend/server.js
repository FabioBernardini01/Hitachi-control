const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const apiRoutes = require('./routes');
const http = require('http');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://hitachi-control.onrender.com'
  ]
}));
app.use(express.json());

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

client.connect()
  .then(() => console.log('✅ Connessione al database PostgreSQL riuscita'))
  .catch(err => console.error('❌ Errore nella connessione al DB:', err));

app.use((req, res, next) => {
  req.db = client;
  next();
});

app.use('/', apiRoutes);

// --- MODIFICA QUI: crea server HTTP e avvia ws.js ---
const server = http.createServer(app);
server.listen(process.env.SERVER_PORT || 4000, '0.0.0.0', () => {
  console.log(`Server listening on port ${process.env.SERVER_PORT || 4000}`);
});

// Avvia WebSocket
require('./ws')(server, client);

// --- Cleanup automatico dei comandi eseguiti/errore più vecchi di 1 minuto/5 giorni ---
setInterval(async () => {
  try {
    await client.query(
      `DELETE FROM commands WHERE status = 'executed' AND executed_at < NOW() - INTERVAL '1 minute'`
    );
    await client.query(
      `DELETE FROM commands WHERE status = 'error' AND executed_at < NOW() - INTERVAL '5 days'`
    );
  } catch (err) {
    console.error('Errore cleanup comandi:', err);
  }
}, 60 * 1000);

module.exports = { client };