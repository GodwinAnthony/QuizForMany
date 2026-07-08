/**
 * Socket.IO wiring.
 *
 * A single default namespace handles both hosts and players. Each
 * live session gets a Socket.IO room named `quiz:<PIN>`; hosts
 * additionally join `host:<PIN>`.
 */

const registerHostHandlers = require('./hostHandlers');
const registerPlayerHandlers = require('./playerHandlers');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // Handlers install their own listeners on the socket. They share
    // the `io` instance via closure so they can broadcast to rooms.
    registerHostHandlers(io, socket);
    registerPlayerHandlers(io, socket);
  });
}

module.exports = registerSocketHandlers;
