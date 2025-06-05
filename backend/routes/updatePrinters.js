const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();
const agentSockets = require('../agentSockets');

// Rotta per aggiornare una stampante (tutti i campi tranne name e company_id)
router.post('/printer/update', authenticateJWT, async (req, res) => {
  const { id: printerId, model, ip_address, modbus_address, modbus_port, description } = req.body;
  const companyId = req.user.company_id;

  try {
    // Verifica che la stampante appartenga all'azienda dell'utente
    const checkQuery = 'SELECT * FROM printers WHERE id = $1 AND company_id = $2';
    const checkResult = await req.db.query(checkQuery, [printerId, companyId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stampante non trovata o non appartenente all\'azienda' });
    }

    // Aggiorna i campi consentiti
    const updateQuery = `
      UPDATE printers
      SET model = $1,
          ip_address = $2,
          modbus_address = $3,
          modbus_port = $4,
          description = $5
      WHERE id = $6 AND company_id = $7
      RETURNING *`;
    const updateResult = await req.db.query(updateQuery, [
      model,
      ip_address,
      modbus_address,
      modbus_port,
      description || '',
      printerId,
      companyId
    ]);

    res.status(200).json({ message: 'Stampante aggiornata con successo', printer: updateResult.rows[0] });

    // --- INVIO EVENTO SOCKET ---
    const agentSocket = agentSockets.get(companyId);
    if (agentSocket && agentSocket.connected) {
      agentSocket.emit('company-updated');
      console.log(`[WS] Evento company-updated inviato all'agent della company ${companyId} (stampante aggiornata)`);
    }

  } catch (error) {
    console.error('Errore durante l\'aggiornamento della stampante:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della stampante' });
  }
});

module.exports = router;