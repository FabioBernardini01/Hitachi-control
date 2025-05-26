require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const fs = require('fs');

const dbConfig = {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
};

const backendUrl = 'http://hitachi-control-backend:4000';

async function main() {
  const client = new Client(dbConfig);
  await client.connect();

  // Prendi tutte le aziende con agent_ip
  const res = await client.query('SELECT id, name, agent_ip FROM companies ORDER BY id');
  let services = '';

  res.rows.forEach((company) => {
    // Prendi username/password agent da .env
    const username = process.env[`AGENT${company.id}_USERNAME`];
    const password = process.env[`AGENT${company.id}_PASSWORD`];

    if (!username || !password) {
      console.warn(`Attenzione: agent per company ${company.id} non trovato in .env, saltato.`);
      return;
    }

    services += `
  ${company.agent_ip}:
    build:
      context: .
      dockerfile: agent/Dockerfile
    container_name: ${company.agent_ip}
    environment:
      - AGENT_USERNAME=${username}
      - AGENT_PASSWORD=${password}
      - BACKEND_URL=${backendUrl}
      - JWT_SECRET=${process.env.JWT_SECRET}
    networks:
      - modbus-network
      - backend-network
`;
  });

  const compose = `
version: '3.8'
services:
${services}
networks:
  modbus-network:
    external: true
    name: modbus-network
  backend-network:
    external: true
    name: backend-network
`;

  fs.writeFileSync('../docker-compose-agents.yml', compose);
  await client.end();
  console.log('docker-compose-agents.yml generato!');
}

main();