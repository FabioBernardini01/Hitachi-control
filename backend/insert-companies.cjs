const { Client } = require('pg');

const companies = [
  { name: 'aziendaX', email1: 'fabio.bernardini.1992@gmail.com', email2: 'onwdded@dwgma', email3: 'e987l3@gmail.com', max_devices: 5 }, 
  { name: 'aziendaY', email1: 'pioAzYY@awdaw', email2: 'dnwd34@dwgma', email3: 'email398776@gmail.com', max_devices: 5 },
  { name: 'aziendaZ', email1: 'miZZZZo@awdaw', email2: '', email3: '', max_devices: 3 },
];

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function insertCompanies() {
  try {
    await client.connect();

    for (const company of companies) {
      const existing = await client.query('SELECT * FROM companies WHERE name = $1', [company.name]);

      if (existing.rows.length > 0) {
        console.log(`Azienda "${company.name}" già esistente. Saltata.`);
        continue;
      }

      await client.query(
        'INSERT INTO companies (name, email1, email2, email3, max_devices) VALUES ($1, $2, $3, $4, $5)',
        [company.name, company.email1, company.email2, company.email3, company.max_devices]
      );
      console.log(`Azienda "${company.name}" inserita con successo.`);
    }

  } catch (err) {
    console.error('Errore durante l\'inserimento delle aziende:', err);
  } finally {
    await client.end();
  }
}

insertCompanies();