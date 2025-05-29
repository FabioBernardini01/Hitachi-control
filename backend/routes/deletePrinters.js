const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();
const agentSockets = require('../agentSockets');

// Rotta per eliminare una stampante
router.post('/printer/delete', authenticateJWT, async (req, res) => {
  const { id: printerId } = req.body;
  const companyId = req.user.company_id;

  try {
    // Verifica che la stampante appartenga all'azienda dell'utente
    const checkQuery = 'SELECT * FROM printers WHERE id = $1 AND company_id = $2';
    const checkResult = await req.db.query(checkQuery, [printerId, companyId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stampante non trovata o non appartenente all\'azienda' });
    }

    // Nel backend, prima elimina i comandi:
    await req.db.query('DELETE FROM commands WHERE printer_id = $1', [printerId]);

    // Elimina la stampante
    const deleteQuery = 'DELETE FROM printers WHERE id = $1';
    await req.db.query(deleteQuery, [printerId]);

    res.status(200).json({ message: 'Stampante eliminata con successo' });

    // --- INVIO EVENTO SOCKET ---
    const agentSocket = agentSockets.get(companyId);
    if (agentSocket && agentSocket.connected) {
      agentSocket.emit('company-updated');
      console.log(`[WS] Evento company-updated inviato all'agent della company ${companyId} (stampante eliminata)`);
    }

  } catch (error) {
    console.error('Errore durante l\'eliminazione della stampante:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della stampante' });
  }
});

module.exports = router;