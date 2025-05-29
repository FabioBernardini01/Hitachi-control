const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');

// L'agent chiede i comandi pendenti per la sua azienda
router.post('/agent/next-command', authenticateJWT, async (req, res) => {
  const companyId = req.user.company_id;
  try {
    const result = await req.db.query(
      `SELECT * FROM commands WHERE company_id = $1 AND status = 'pending' ORDER BY created_at ASC`,
      [companyId]
    );
    // Deserializza il payload e lo "spalma" nell'oggetto comando
    const commands = result.rows.map(cmd => ({
      ...cmd,
      ...(typeof cmd.payload === 'string' ? JSON.parse(cmd.payload) : cmd.payload)
    }));
    res.json({ commands }); // <-- usa commands, NON result.rows!
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero comandi' });
  }
});

module.exports = router;