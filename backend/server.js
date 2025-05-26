const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const apiRoutes = require('./routes');

// Carica variabili ambiente da .env
//dotenv.config({ path: '/home/fabio/hitachi-control/.env' });


const app = express();

// Middleware CORS: consente le richieste dal frontend React
app.use(cors({ origin: 'http://localhost:3000' }));

// Middleware per parse del JSON nelle richieste
app.use(express.json());

// Configura il client PostgreSQL
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

// Middleware per iniettare il client PostgreSQL in ogni richiesta
app.use((req, res, next) => {
  req.db = client;
  next();
});

// Rotte API (devono essere definite DOPO il middleware sopra)
app.use('/', apiRoutes);

// Avvia il server
app.listen(process.env.SERVER_PORT || 4000, '0.0.0.0', () => {
  console.log(`Server listening on port ${process.env.SERVER_PORT || 4000}`);
});


// --- Cleanup automatico dei comandi eseguiti/errore più vecchi di 1 ora ---
setInterval(async () => {
  try {
    await client.query(
      `DELETE FROM commands WHERE status IN ('executed', 'error') AND executed_at < NOW() - INTERVAL '1 hour'`
    );
    // console.log('Cleanup comandi eseguito');
  } catch (err) {
    console.error('Errore cleanup comandi:', err);
  }
}, 60 * 60 * 1000); // ogni ora