const Modbus = require('jsmodbus');
const net = require('net');

//const { authenticateJWT } = require('../middleware/auth');

// Funzione per leggere lo stato della stampante

async function readPrinterStatus(ip, port, UID, address = 0, length = 1) {
  //console.log('readPrinterStatus chiamata con:', ip, port, UID, address, length);
  const parsedAddress = parseAddress(address);

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, Number(UID));

    const timeout = setTimeout(() => {
      socket.destroy();
      reject({ code: 'ETIMEDOUT', message: 'Timeout di connessione Modbus' });
    }, 5000);

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    socket.connect({ host: ip, port: port }, () => {
      client.readHoldingRegisters(parsedAddress, Number(length))
        .then((data) => {
          clearTimeout(timeout);
          socket.end();
          resolve(data.response.body);
        })
        .catch((err) => {
          clearTimeout(timeout);
          socket.end();
          reject(err);
        });
    });
  });
}


async function writePrinterRegisters(ip, port, UID, address, values) {
  const parsedAddress = parseAddress(address);

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, Number(UID));

    socket.on('error', (err) => reject(err));

    socket.connect({ host: ip, port: port }, () => {
      client.writeMultipleRegisters(parsedAddress, Buffer.from(values.flatMap(v => [v >> 8, v & 0xFF])))
        .then((response) => {
          socket.end();
          resolve(response);
        })
        .catch((err) => {
          socket.end();
          reject(err);
        });
    });
  });
}


async function readPrinterInputRegister(ip, port, UID, address = 0, length = 1) {
  //console.log('readPrinterInputRegister chiamata con:', ip, port, UID, address, length);
  const parsedAddress = parseAddress(address);

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, Number(UID));

    const timeout = setTimeout(() => {
      socket.destroy();
      reject({ code: 'ETIMEDOUT', message: 'Timeout di connessione Modbus' });
    }, 5000);

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    socket.connect({ host: ip, port: port }, () => {
      client.readInputRegisters(parsedAddress, Number(length))
        .then((data) => {
          clearTimeout(timeout);
          socket.end();
          resolve(data.response.body);
        })
        .catch((err) => {
          clearTimeout(timeout);
          socket.end();
          reject(err);
        });
    });
  });
}


function parseAddress(address) {
  if (typeof address === 'string' && address.startsWith('0x')) {
    return parseInt(address, 16); // esadecimale
  }
  return Number(address); // decimale
}


module.exports = {
  readPrinterStatus,
  writePrinterRegisters,
  readPrinterInputRegister
};

