const { readPrinterInputRegister, writePrinterRegisters, readPrinterStatus } = require('./clientmodbus');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// CONFIGURAZIONE AGENT tramite variabili d'ambiente
const AGENT_USERNAME = process.env.AGENT_USERNAME;
const AGENT_PASSWORD = process.env.AGENT_PASSWORD;
const BACKEND_URL = process.env.BACKEND_URL || 'https://hitachi-control-backend.onrender.com';
const POLL_INTERVAL = 20000; // ms
const POLL_INTERVAL_BE = 1000; // ms

console.log("DEBUG AGENT_USERNAME:", process.env.AGENT_USERNAME);
console.log("DEBUG AGENT_PASSWORD:", process.env.AGENT_PASSWORD);
console.log("DEBUG BACKEND_URL:", process.env.BACKEND_URL);


const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true', // true per 465, false per 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


let printers = [];
let emailRecipients = [];
let lastNotifiedEmails = {};
let AUTH_TOKEN = null;
let REFRESH_TOKEN = null;
let lastNotifiedErrorCode = {};
let lastNotifiedTimestamp = {};
let pendingEmails = [];

// --- MOCK: controlla se c'è internet (in locale restituisce sempre true) ---
async function hasInternet() {
  return true;
}


/*
// --- Funzione invio email (mock con coda e internet check) ---
async function sendEmail(recipients, subject, text) {
  if (!recipients || recipients.length === 0) {
    console.log('Nessun destinatario email specificato, email non inviata.');
    return;
  }
  if (!(await hasInternet())) {
    pendingEmails.push({ recipients, subject, text });
    console.log('[EMAIL ACCODATA] Internet assente, email accodata.');
    return;
  }
  console.log(`\n--- EMAIL FINTA ---\nTO: ${recipients.join(', ')}\nSUBJECT: ${subject}\nBODY:\n${text}\n-------------------\n`);
}

*/


async function sendEmail(recipients, subject, text) {
  if (!recipients || recipients.length === 0) {
    console.log('Nessun destinatario email specificato, email non inviata.');
    return;
  }
  if (!(await hasInternet())) {
    pendingEmails.push({ recipients, subject, text });
    console.log('[EMAIL ACCODATA] Internet assente, email accodata.');
    return;
  }
  try {
    let info = await smtpTransport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients.join(','),
      subject,
      text,
    });
    console.log(`[EMAIL INVIATA] TO: ${recipients.join(', ')} SUBJECT: ${subject} MESSAGE_ID: ${info.messageId}`);
  } catch (err) {
    pendingEmails.push({ recipients, subject, text });
    console.error('[EMAIL ERRORE] Invio fallito, email accodata:', err.message);
  }
}

async function flushPendingEmails() {
  if (pendingEmails.length === 0) return;
  if (!(await hasInternet())) return;
  console.log(`[EMAIL] Internet ripristinato, invio ${pendingEmails.length} email accodate...`);
  for (const mail of pendingEmails) {
    await sendEmail(mail.recipients, mail.subject, mail.text);
  }
  pendingEmails = [];
}
// --- Login e refresh token ---
async function getAgentToken(username, password, backendUrl) {
  try {
    const res = await axios.post(`${backendUrl}/login`, { username, password });
    return { token: res.data.token, refreshToken: res.data.refreshToken };
  } catch (err) {
    console.error('Errore login agent:', err.message);
    return null;
  }
}

async function refreshToken() {
  if (!REFRESH_TOKEN) {
    console.error('[Agent] Nessun refresh token disponibile!');
    return;
  }
  try {
    const res = await axios.post(`${BACKEND_URL}/refresh`, { refreshToken: REFRESH_TOKEN });
    AUTH_TOKEN = res.data.token;
    if (res.data.refreshToken) REFRESH_TOKEN = res.data.refreshToken;
    console.log('[Agent] Token JWT aggiornato tramite refresh token');
  } catch (err) {
    console.error('[Agent] Errore nel refresh del token JWT!', err.message);
  }
}

// --- Scarica lista stampanti e destinatari email ---
async function fetchPrintersAndEmails() {
  try {
    const companyInfoRes = await axios.get(`${BACKEND_URL}/me/company`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    const company = companyInfoRes.data;
    emailRecipients = [company.email1, company.email2, company.email3].filter(Boolean);

    const printersRes = await axios.get(`${BACKEND_URL}/printers`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    printers = printersRes.data;

    console.log(`Trovate ${printers.length} stampanti. Destinatari email: ${emailRecipients.join(', ')}`);
  } catch (err) {
    if (!(await hasInternet())) {
      console.error('[Agent] Internet assente, uso ultima configurazione valida. Email accodate.');
    } else {
      console.error('[Agent] Backend non raggiungibile, uso ultima configurazione valida. Email inviate normalmente.');
    }
  }
}

// --- Polling su tutte le stampanti per errori (come prima) ---
async function pollAllPrinters() {
  const now = Date.now();
  for (const printer of printers) {
    try {
      const data = await readPrinterInputRegister(
        printer.ip_address,
        printer.modbus_port,
        printer.modbus_address,
        0x0004,
        3
      );
      const [functionCode, classification, errorFactor] = data._values;
      const errorPresent = functionCode !== 0 || classification !== 0 || errorFactor !== 0;
      const errorCode = `${functionCode}-${classification}-${errorFactor}`;
      const prevError = lastNotifiedErrorCode[printer.id];
      const prevTimestamp = lastNotifiedTimestamp[printer.id];

      if (!errorPresent) {
        lastNotifiedErrorCode[printer.id] = "0-0-0";
        lastNotifiedTimestamp[printer.id] = undefined;
        lastNotifiedEmails[printer.id] = undefined;
        console.log(`[${printer.name}] OK`);
      } else {
        const emailsChanged = JSON.stringify(emailRecipients) !== JSON.stringify(lastNotifiedEmails[printer.id]);
        if (prevError !== errorCode || emailsChanged) {
          console.log(`[${printer.name}] ERROR: functionCode=${functionCode}, classification=${classification}, errorFactor=${errorFactor}`);
          await sendEmail(
            emailRecipients,
            `Errore stampante ${printer.name}`,
            `Stampante ${printer.name} ha segnalato errore:\nFunction code: ${functionCode}\nClassification: ${classification}\nError factor: ${errorFactor}\n(IP: ${printer.ip_address})`
          );
          lastNotifiedErrorCode[printer.id] = errorCode;
          lastNotifiedTimestamp[printer.id] = now;
          lastNotifiedEmails[printer.id] = [...emailRecipients];
        } else {
          if (prevTimestamp && (now - prevTimestamp) > 60 * 60 * 1000) {
            await sendEmail(
              emailRecipients,
              `ALREADY NOTIFIED - Errore persistente stampante ${printer.name}`,
              `ALREADY NOTIFIED: Stampante ${printer.name} ha ancora errore:\nFunction code: ${functionCode}\nClassification: ${classification}\nError factor: ${errorFactor}\n(IP: ${printer.ip_address}) dopo oltre 1 ora`
            );
            lastNotifiedTimestamp[printer.id] = now;
            lastNotifiedEmails[printer.id] = [...emailRecipients];
            console.log(`[${printer.name}] ALREADY NOTIFIED: errore persistente, inviata nuova mail.`);
          } else {
            console.log(`[${printer.name}] Errore già notificato (${errorCode}), nessuna nuova mail.`);
          }
        }
      }
    } catch (err) {
      const code = err && err.code ? err.code : 'unknown';
      console.log(`[${printer.name}] ERROR: ${code}`, err.message || err);
    }
  }
  await flushPendingEmails();
}

// --- Polling verso il backend per ricevere comandi da eseguire ---
async function pollBackendForCommands() {
  try {
    const res = await axios.post(
      `${BACKEND_URL}/agent/next-command`,
      {},
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    );
    const commands = res.data?.commands || [];
    for (const cmd of commands) {
      let result = { commandId: cmd.id, success: false, error: null, data: null };
      try {
        
        if (cmd.type === 'readInputRegister') {
          const data = await readPrinterInputRegister(
            cmd.ip_address, cmd.modbus_port, cmd.modbus_address, cmd.address, cmd.length
          );
          result.success = true;
          result.data = data;
        } else if (cmd.type === 'writeRegisters') {
          const data = await writePrinterRegisters(
            cmd.ip_address, cmd.modbus_port, cmd.modbus_address, cmd.address, cmd.values
          );
          result.success = true;
          result.data = data;
        } else if (cmd.type === 'readStatus') {
          const data = await readPrinterStatus(
            cmd.ip_address, cmd.modbus_port, cmd.modbus_address, cmd.address, cmd.length
          );
          result.success = true;
          result.data = data;
        } else {
          result.error = 'Tipo comando non supportato';
        }
      } catch (err) {
        result.error = err.message || 'Errore esecuzione comando';
      }
      // Invia il risultato al backend
      try {
        await axios.post(
          `${BACKEND_URL}/agent/command-result`,
          result,
          { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );
      } catch (err) {
        console.error('[Agent] Errore invio risultato comando:', err.message);
      }
    }
  } catch (err) {
    console.error('[Agent] Errore polling comandi dal backend:', err.message);
  }
}

// --- Main loop ---
async function main() {
  const loginRes = await getAgentToken(AGENT_USERNAME, AGENT_PASSWORD, BACKEND_URL);
  if (!loginRes) {
    console.error('Impossibile ottenere il token JWT, agent non avviato.');
    process.exit(1);
  }
  AUTH_TOKEN = loginRes.token;
  REFRESH_TOKEN = loginRes.refreshToken;
  await fetchPrintersAndEmails();
  setInterval(pollAllPrinters, POLL_INTERVAL);
  setInterval(fetchPrintersAndEmails, 1 * 60 * 1000);
  setInterval(refreshToken, 59 * 60 * 1000);
  setInterval(pollBackendForCommands, POLL_INTERVAL_BE); // <-- Polling comandi dal backend
}

main();