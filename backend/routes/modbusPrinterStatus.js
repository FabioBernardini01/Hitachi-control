const express = require('express');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

router.post('/readStatus', authenticateJWT, async (req, res) => {
  const { name, address = 0, length = 1 } = req.body;
  const db = req.db;
  const companyId = req.user.company_id;

  if (!name) {
    return res.status(400).json({ message: 'Il nome della stampante è obbligatorio.' });
  }

  try {
    // Recupera dati stampante
    const query = 'SELECT id, ip_address, modbus_port, modbus_address FROM printers WHERE name = $1 AND company_id = $2';
    const values = [name, companyId];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      console.warn(`[READ STATUS] Stampante "${name}" non trovata per company_id=${companyId}`);
      return res.status(404).json({ message: 'Stampante non trovata o non appartenente alla tua azienda.' });
    }
    const printer = result.rows[0];
    //console.log(`[READ STATUS] Stampante trovata:`, printer);

    // Accoda il comando
    const payload = {
      ip_address: printer.ip_address,
      modbus_port: Number(printer.modbus_port),
      modbus_address: Number(printer.modbus_address),
      address,
      length
    };
    const insertCmd = await db.query(
      `INSERT INTO commands (company_id, printer_id, type, payload, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [
        companyId,
        printer.id,
        'readStatus',
        JSON.stringify(payload)
      ]
    );

    const agentSockets = require('../agentSockets');
const agentSocket = agentSockets.get(companyId);
if (agentSocket && agentSocket.connected) {
  agentSocket.emit('execute-commands');
  console.log(`[WS] Evento execute-commands inviato all'agent della company ${companyId}`);
}
    //console.log('[READ STATUS] Comando accodato:', { commandId: insertCmd.rows[0].id, payload });

    const commandId = insertCmd.rows[0].id;

    // Attendi che l'agent esegua il comando (polling breve, max 10s)
    let resultCmd = null;
    for (let i = 0; i < 20; i++) {
      const check = await db.query(
        `SELECT status, result FROM commands WHERE id = $1`,
        [commandId]
      );
      if (check.rows.length && check.rows[0].status !== 'pending') {
        resultCmd = check.rows[0];
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!resultCmd) {
      console.warn(`[READ STATUS] Timeout per comando id=${commandId}`);
      return res.status(504).json({ message: 'Timeout: nessuna risposta dall\'agent.' });
    }
    if (resultCmd.status === 'error') {
      console.error(`[READ STATUS] Errore agent per comando id=${commandId}:`, resultCmd.result);
      return res.status(500).json({ message: 'Errore agent', detail: resultCmd.result });
    }
    //console.log(`[READ STATUS] Risposta agent per comando id=${commandId}:`, resultCmd.result);
    res.json({ success: true, data: resultCmd.result.data });

  } catch (error) {
    console.error('Errore nella lettura dello stato della stampante:', error.code, error.message);
    res.status(500).json({
      error: true,
      code: error.code || 'UNKNOWN',
      message: 'Errore nel comunicare con l\'agent o la stampante.'
    });
  }
});

module.exports = router;