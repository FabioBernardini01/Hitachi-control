const { Server } = require('socket.io');
const { client } = require('./server'); // Usa il client già connesso

module.exports = function(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'https://hitachi-control.onrender.com'
      ]
    }
  });

  io.on('connection', (socket) => {
    console.log('Nuovo client FE connesso via WebSocket:', socket.id);

    // Invia lo stato delle stampanti ogni 5 secondi
    const interval = setInterval(async () => {
      try {
        const res = await client.query('SELECT * FROM printers');
        socket.emit('printerStatus', res.rows);
      } catch (err) {
        socket.emit('printerStatus', []);
      }
    }, 5000);

    socket.on('disconnect', () => {
      clearInterval(interval);
      console.log('Client FE disconnesso:', socket.id);
    });
  });

  module.exports.io = io;
};