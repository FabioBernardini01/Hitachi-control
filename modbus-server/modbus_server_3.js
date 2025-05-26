const dotenv = require('dotenv');
const Modbus = require('jsmodbus');
const net = require('net');

dotenv.config({ path: '/app/.env' });

const modbusServerHost = process.env.MODBUS_SERVERHOST_3 || '0.0.0.0';
const modbusPort = process.env.MODBUS_3_PORT;

// Preset errori simulati
const errorList = [
  { functionCode: 0x0010, classification: 0x000F, errorFactor: 0x0002 },
  { functionCode: 0x0003, classification: 0x0001, errorFactor: 0x0005 },
  { functionCode: 0x0007, classification: 0x0002, errorFactor: 0x0008 },
  { functionCode: 0x000C, classification: 0x000A, errorFactor: 0x0001 }
];

// Holding Registers (0x0000–0x260F -> 9744 registri -> 19488 byte)
let holdingRegisters = Buffer.alloc(19488);

// Input Registers (0x0000–0x0F06 -> 3846 registri -> 7692 byte)
let inputRegisters = Buffer.alloc(7692);

// ----------------------
// Inizializzazione HOLDING REGISTERS (conformi al manuale)
// ----------------------

// 0x0000 - Start/Stop Control Flag
holdingRegisters.writeUInt16BE(0x0000, 0x0000 * 2);

// 0x0010 - Print Job Registration Number
holdingRegisters.writeUInt16BE(1, 0x0010 * 2);

// 0x0011 - Inter-character space (character position)
holdingRegisters.writeUInt16BE(5, 0x0011 * 2);

// 0x0020 - Character count (Print item 1)
holdingRegisters.writeUInt16BE(6, 0x0020 * 2);

// 0x0084–0x0089 - Print contents (6 caratteri: A-F)
const characters = ['A', 'B', 'C', '1', '2', '3'].map(c => c.charCodeAt(0));
characters.forEach((charCode, i) => {
  holdingRegisters.writeUInt16BE(charCode, (0x0084 + i) * 2);
});

// ----------------------
// Inizializzazione INPUT REGISTERS (conformi al manuale)
// ----------------------

// 0x0000 - Communication status (0x0031 = Online)
inputRegisters.writeUInt16BE(0x0031, 0x0000 * 2);

// 0x0001 - Receive enable/disable status (0x0031 = Enabled)
inputRegisters.writeUInt16BE(0x0031, 0x0001 * 2);

// 0x0002 - Operation status (es. 0x0001 = Ready)
inputRegisters.writeUInt16BE(0x0001, 0x0002 * 2);

// 0x0003 - Warning status (0x0000 = No warning)
inputRegisters.writeUInt16BE(0x0000, 0x0003 * 2);

// 0x0004–0x0006 - Analysis information 1-3 (function code, classification, error factor)
inputRegisters.writeUInt16BE(0x0000, 0x0004 * 2); // no error
inputRegisters.writeUInt16BE(0x0000, 0x0005 * 2); // no classification
inputRegisters.writeUInt16BE(0x0000, 0x0006 * 2); // no factor

// 0x0008 - Operation status (details) (0x00F0 = Starting)
inputRegisters.writeUInt16BE(0x00F0, 0x0008 * 2);

// 0x0EF0 - Current job data length (char x 2)
inputRegisters.writeUInt16BE(12, 0x0EF0 * 2);

// 0x0EF1 - Inter-character space (legge da holding 0x0011)
inputRegisters.writeUInt16BE(5, 0x0EF1 * 2);

// 0x0EF2 - Calendar block count
inputRegisters.writeUInt16BE(2, 0x0EF2 * 2);

// 0x0EF3–0x0EFA - Calendar characters count per block
[3,4,0,0,0,0,0,0].forEach((val, i) => {
  inputRegisters.writeUInt16BE(val, (0x0EF3 + i) * 2);
});

// 0x0EFB–0x0EFE - Blocchi attivi
inputRegisters.writeUInt16BE(1, 0x0EFB * 2); // Time count block
inputRegisters.writeUInt16BE(1, 0x0EFC * 2); // Shift code block
inputRegisters.writeUInt16BE(2, 0x0EFD * 2); // Shift rule count
inputRegisters.writeUInt16BE(1, 0x0EFE * 2); // Count block

// 0x0EFF–0x0F06 - Count characters count per block
[2,0,0,0,0,0,0,0].forEach((val, i) => {
  const reg = 0x0EFF + i;
  if (reg * 2 < inputRegisters.length) {
    inputRegisters.writeUInt16BE(val, reg * 2);
  }
});

// 0x0BEB - Ink remaining level (0x0064 = 100, 0x0002 = minimo, 0x0000 = Empty)
let inkLevel = 100; // livello iniziale (decimale 100)
inputRegisters.writeUInt16BE(inkLevel, 0x0BEB * 2);

// Stato per ricordare se la macchina è stata spenta per inchiostro basso
let stoppedForInk = false;

const server = net.createServer();
const modbusServer = new Modbus.server.TCP(server, {
  host: modbusServerHost,
  port: modbusPort,
  holding: holdingRegisters,
  input: inputRegisters
});

server.listen(modbusPort, modbusServerHost, () => {
  console.log(`✅ Modbus server conforme in ascolto su ${modbusServerHost}:${modbusPort}`);
});

// --- LOGICA DI SIMULAZIONE ERRORI ---
// Ogni 60 secondi può generare o risolvere un errore nei registri 0x0004–0x0006

const randomOffset = Math.floor(Math.random() * 60000); // fino a 60 secondi

setTimeout(() => {
  setInterval(() => {
    const currentErrorFactor = inputRegisters.readUInt16BE(0x0006 * 2);

    if (currentErrorFactor === 0) {
      if (Math.random() < 0.2) {
        const rnd = Math.random();
        const idx = Math.floor(rnd * errorList.length);
        const err = errorList[idx];
        console.log(`[DEBUG] Math.random(): ${rnd}, idx: ${idx}`);
        inputRegisters.writeUInt16BE(err.functionCode, 0x0004 * 2);
        inputRegisters.writeUInt16BE(err.classification, 0x0005 * 2);
        inputRegisters.writeUInt16BE(err.errorFactor, 0x0006 * 2);
        console.log(`[SIMULAZIONE] Errore generato: funzione 0x${err.functionCode.toString(16)}, classe 0x${err.classification.toString(16)}, fattore 0x${err.errorFactor.toString(16)}`);
      }
    } else {
      if (Math.random() < 0.5) {
        inputRegisters.writeUInt16BE(0x0000, 0x0004 * 2);
        inputRegisters.writeUInt16BE(0x0000, 0x0005 * 2);
        inputRegisters.writeUInt16BE(0x0000, 0x0006 * 2);
        console.log('[SIMULAZIONE] Errore rientrato');
      }
    }
  }, 10 * 1000);
}, randomOffset);


// Warning randomico
let randomWarningActive = false;
setInterval(() => {
  if (!randomWarningActive && Math.random() < 0.25) {
    inputRegisters.writeUInt16BE(0x0001, 0x0003 * 2); // Warning ON
    randomWarningActive = true;
    console.log('[SIMULAZIONE] Warning random attivato (input 0x0003 = 1)');
  } else if (randomWarningActive && Math.random() < 0.25) {
    inputRegisters.writeUInt16BE(0x0000, 0x0003 * 2); // Warning OFF
    randomWarningActive = false;
    console.log('[SIMULAZIONE] Warning random rientrato (input 0x0003 = 0)');
  }
}, 5000);

// Warning inchiostro (solo se warning randomico non attivo)
if (!randomWarningActive) {
  if (inkLevel > 2 && inkLevel <= 40) {
    inputRegisters.writeUInt16BE(0x0001, 0x0003 * 2); // Warning ON
  } else {
    inputRegisters.writeUInt16BE(0x0000, 0x0003 * 2); // Warning OFF
  }
}

// --- LOGICA DI SIMULAZIONE LIVELLO INCHIOSTRO + STOP/RIPARTENZA AUTOMATICA SU ERRORE ---
setInterval(() => {
  const isRunning = holdingRegisters.readUInt16BE(0x0000 * 2) === 1;
  const isStoppedForError = holdingRegisters.readUInt16BE(0x0000 * 2) === 2;
  const functionCode = inputRegisters.readUInt16BE(0x0004 * 2);
  const classification = inputRegisters.readUInt16BE(0x0005 * 2);
  const errorFactor = inputRegisters.readUInt16BE(0x0006 * 2);
  const errorPresent = functionCode !== 0 || classification !== 0 || errorFactor !== 0;


  // Se c'è errore e la stampante è in funzione, metti holding 0 a 2 (ferma per errore)
  if (isRunning && errorPresent) {
    holdingRegisters.writeUInt16BE(0x0002, 0x0000 * 2); // Stop per errore
    console.log('[SIMULAZIONE] STOP automatico: stampante fermata per errore (holding 0 = 2).');
    return;
  }

  // Se non c'è errore, la stampante era ferma SOLO per errore, riavviala (holding 0 = 1)
  if (isStoppedForError && !stoppedForInk && !errorPresent) {
    holdingRegisters.writeUInt16BE(0x0001, 0x0000 * 2); // Start
    console.log('[SIMULAZIONE] Riavvio automatico: stampante riavviata dopo fine errore (holding 0 = 1).');
  }

  // Consumo inchiostro solo se in funzione, non in errore, non in stop per inchiostro basso
  if (isRunning && !stoppedForInk && !errorPresent) {
    if (inkLevel > 2) {
      inkLevel--;
      inputRegisters.writeUInt16BE(inkLevel, 0x0BEB * 2);
      //console.log(`[SIMULAZIONE] Livello inchiostro: ${inkLevel}`);
    } else {
      // Se arriva a 2, spegni la macchina e segna che è stata spenta per inchiostro basso
      holdingRegisters.writeUInt16BE(0x0000, 0x0000 * 2); // Stop manuale
      stoppedForInk = true;
      console.log('[SIMULAZIONE] Inchiostro troppo basso! Stampante spenta (holding 0 = 0).');
    }
  }
}, 5000);

// --- LOGICA RABBOCCO INCHIOSTRO ALLA RIACCENSIONE ---
setInterval(() => {
  const isRunning = holdingRegisters.readUInt16BE(0x0000 * 2) === 1;
  if (isRunning && stoppedForInk) {
    inkLevel = 100;
    inputRegisters.writeUInt16BE(inkLevel, 0x0BEB * 2);
    stoppedForInk = false;
    console.log('[SIMULAZIONE] Stampante riavviata: inchiostro riportato a 100.');
  }
}, 1000);