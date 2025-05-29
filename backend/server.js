const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const apiRoutes = require('./routes');
const http = require('http');

// Carica variabili ambiente da .env
//dotenv.config({ path: '/home/fabio/hitachi-control/.env' });


const app = express();



const server = http.createServer(app);

// Middleware CORS: consente le richieste dal frontend React
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://hitachi-control.onrender.com'
  ]
}));
// Middleware per parse del JSON nelle richieste
app.use(express.json());

// Configura il client PostgreSQL
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
// Middleware per iniettare il client PostgreSQL in ogni richiesta
app.use((req, res, next) => {
  req.db = client;
  next();
});

// Rotte API (devono essere definite DOPO il middleware sopra)
app.use('/', apiRoutes);

// Avvia il server
server.listen(process.env.SERVER_PORT || 4000, '0.0.0.0', () => {
  console.log(`Server listening on port ${process.env.SERVER_PORT || 4000}`);
});


// Avvia la logica WebSocket
require('./ws')(server); //

// --- Cleanup automatico dei comandi eseguiti/errore più vecchi di 1 minuto/5 giorni ---
setInterval(async () => {
  try {
    // Elimina comandi executed più vecchi di 1 minuto
    await client.query(
      `DELETE FROM commands WHERE status = 'executed' AND executed_at < NOW() - INTERVAL '1 minute'`
    );
    // Elimina comandi error più vecchi di 5 giorni
    await client.query(
      `DELETE FROM commands WHERE status = 'error' AND executed_at < NOW() - INTERVAL '5 days'`
    );
  } catch (err) {
    console.error('Errore cleanup comandi:', err);
  }
}, 60 * 1000);  // ogni 1 minuto

// ...existing code...

module.exports = { client };