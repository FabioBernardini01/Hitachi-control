-- Crea tabella aziende
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  agent_ip TEXT NOT NULL,
  email1 TEXT NOT NULL,
  email2 TEXT,
  email3 TEXT
);

-- Crea tabella utenti
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  company_id INTEGER REFERENCES companies(id)
);

-- Crea tabella stampanti
CREATE TABLE IF NOT EXISTS printers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  ip_address TEXT,
  modbus_port TEXT,
  modbus_address TEXT,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commands (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  printer_id INTEGER REFERENCES printers(id),
  type TEXT NOT NULL, -- es: 'readInputRegister', 'writeRegisters', 'readStatus'
  payload JSONB NOT NULL, -- parametri comando (indirizzi, valori, ecc)
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'executed', 'error'
  result JSONB, -- risposta dell'agent
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP
);



-- Impone unicità del nome stampante per azienda
ALTER TABLE printers
ADD CONSTRAINT unique_name_per_company UNIQUE (name, company_id);


-- Impone unicità della configurazione IP+porta+modbus_address globalmente
--ALTER TABLE printers
--ADD CONSTRAINT unique_modbus_config UNIQUE (ip_address, modbus_port, modbus_address);



-- Impone unicità della configurazione IP+porta globalmente 
--ALTER TABLE printers
--ADD CONSTRAINT unique_duplet_modbus_config UNIQUE (ip_address, modbus_port);
-- CANCELLA BLOCCO SOPRA SE IP+MODBUS uguale va bene (al netto di uid differente)