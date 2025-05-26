const express = require('express');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Rotta per creare una nuova stampante
router.post('/printers', authenticateJWT, async (req, res) => {
  const db = req.db;
  const { name, model, ip_address, modbus_address, modbus_port, description } = req.body;
  const companyId = req.user.company_id;

  // Controllo campi obbligatori
  if (!name || !ip_address || !companyId || !modbus_address || !modbus_port) {
    return res.status(400).json({ error: 'Nome, IP, modbus_address, modbus_port sono obbligatori' });
  }

  try {
    // ⚠️ Verifica se esiste già una stampante con la stessa combinazione IP + Porta + Modbus Address
    const existing = await db.query(
      `SELECT id FROM printers 
       WHERE ip_address = $1 AND modbus_port = $2 AND modbus_address = $3`,
      [ip_address, modbus_port, modbus_address]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Esiste già una stampante con questa combinazione di IP, porta e indirizzo Modbus' 
      });
    }
 // ⚠️ Verifica se esiste già una stampante con la stessa combinazione IP + Porta
    const existing2 = await db.query(
      `SELECT id FROM printers 
       WHERE ip_address = $1 AND modbus_port = $2`,
      [ip_address, modbus_port]
    );

    if (existing2.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Esiste già una stampante con questa combinazione di IP, porta' 
      });
    }
//CANCELLA BLOCCO SOPRA SE IP+MODBUS uguale va bene (al netto di uid differente)

    // 🟢 Inserisce la stampante se tutto ok
    const result = await db.query(
      `INSERT INTO printers (name, model, ip_address, modbus_address, modbus_port, description, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, model, ip_address, modbus_address, modbus_port, description || '', companyId]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    if (error.code === '23505') {
      // Errore di vincolo UNIQUE su (name, company_id)
      return res.status(409).json({ error: 'Nome stampante già esistente per questa azienda' });
    }

    console.error('Errore nella creazione stampante:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;
