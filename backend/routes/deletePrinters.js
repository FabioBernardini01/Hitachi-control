const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

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

    // Elimina la stampante
    const deleteQuery = 'DELETE FROM printers WHERE id = $1';
    await req.db.query(deleteQuery, [printerId]);

    res.status(200).json({ message: 'Stampante eliminata con successo' });
  } catch (error) {
    console.error('Errore durante l\'eliminazione della stampante:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della stampante' });
  }
});

module.exports = router;