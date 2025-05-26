const { Client } = require('pg');

const printers = [
  {
    name: 'Stampante 1',
    model: 'Hitachi UX2',
    ip_address: '192.168.1.10',
    modbus_port: '503',
    modbus_address: '1',
    description: 'Stampante Modbus 1',
    company_id: 1,
  },
  {
    name: 'Stampante 2',
    model: 'Hitachi UX2',
    ip_address: '192.168.1.11',
    modbus_port: '504',
    modbus_address: '1',
    description: 'Stampante Modbus 2',
    company_id: 1,
  },
  {
    name: 'Stampante 1',
    model: 'Hitachi UX2',
    ip_address: '192.168.1.12',
    modbus_port: '505',
    modbus_address: '1',
    description: 'Stampante Modbus 3',
    company_id: 2,
  },
];

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function insertPrinters() {
  try {
    await client.connect();

    for (const printer of printers) {
      const existing = await client.query(
        'SELECT * FROM printers WHERE name = $1 AND company_id = $2',
        [printer.name, printer.company_id]
      );

      if (existing.rows.length > 0) {
        console.log(`Stampante "${printer.name}" già esistente. Saltato.`);
        continue;
      }

      await client.query(
        `INSERT INTO printers 
          (name, model, ip_address, modbus_port, modbus_address, description, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          printer.name,
          printer.model,
          printer.ip_address,
          printer.modbus_port,
          printer.modbus_address,
          printer.description,
          printer.company_id,
        ]
      );
      console.log(`Stampante "${printer.name}" inserita con successo.`);
    }
  } catch (err) {
    console.error('Errore durante l\'inserimento delle stampanti:', err);
  } finally {
    await client.end();
  }
}

insertPrinters();