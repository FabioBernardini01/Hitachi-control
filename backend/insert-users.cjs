const bcrypt = require('bcrypt');
const { Client } = require('pg');

const users = [
  { username: 'utenteA', password: 'password', company_id: 1, failed_attempts: 0, locked_until: null, enabled: true, session_token: null },
  { username: 'utenteB', password: 'password', company_id: 2, failed_attempts: 0, locked_until: null, enabled: true, session_token: null },
  { username: 'utenteC', password: 'password', company_id: 2, failed_attempts: 0, locked_until: null, enabled: true, session_token: null },
  { username: 'utenteD', password: 'password', company_id: 3, failed_attempts: 0, locked_until: null, enabled: true, session_token: null },
  { username: 'lkj', password: 'òlkpoi098', company_id: 3, failed_attempts: 0, locked_until: null, enabled: true, session_token: null },
  // AGENT USERS (uno per azienda)
  { username: process.env.AGENT1_USERNAME, password: process.env.AGENT1_PASSWORD, company_id: 1, failed_attempts: 0, locked_until: null, enabled: true, session_token: null },
  { username: process.env.AGENT2_USERNAME, password: process.env.AGENT2_PASSWORD, company_id: 2, failed_attempts: 0, locked_until: null, enabled: true, session_token: null },
  { username: process.env.AGENT3_USERNAME, password: process.env.AGENT3_PASSWORD, company_id: 3, failed_attempts: 0, locked_until: null, enabled: true, session_token: null },
];

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function insertUsers() {
  try {
    await client.connect();

    for (const user of users) {
      const existing = await client.query('SELECT * FROM users WHERE username = $1', [user.username]);

      if (existing.rows.length > 0) {
        console.log(`Utente "${user.username}" già esistente. Saltato.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      await client.query(
        `INSERT INTO users (username, password, company_id, failed_attempts, locked_until, enabled)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.username, hashedPassword, user.company_id, user.failed_attempts, user.locked_until, user.enabled]
      );
      console.log(`Utente "${user.username}" inserito con successo.`);
    }

  } catch (err) {
    console.error('Errore durante l\'inserimento degli utenti:', err);
  } finally {
    await client.end();
  }
}

insertUsers();