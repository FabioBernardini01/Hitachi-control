const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const agentSockets = new Map(); // companyId -> socket

module.exports = function(server, client) {
  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'https://hitachi-control.onrender.com'
      ]
    }
  });

  io.on('connection', (socket) => {
    let companyId = null;

    // Agent si autentica
    socket.on('agent-auth', ({ token }) => {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload && payload.company_id) {
          companyId = payload.company_id;
          agentSockets.set(companyId, socket);
          socket.companyId = companyId;
          console.log('Agent connesso per company', companyId);
        }
      } catch (err) {
        socket.disconnect();
      }
    });

    socket.on('disconnect', () => {
      if (socket.companyId && agentSockets.get(socket.companyId) === socket) {
        agentSockets.delete(socket.companyId);
        console.log('Agent disconnesso per company', socket.companyId);
      }
    });
  });

  module.exports.agentSockets = agentSockets;
  module.exports.io = io;
};