const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { setIO } = require('./socketState');

// Keep room naming centralized for emit/join consistency.
const eventRoom = (eventId) => `event:${eventId}`;

const verifySocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers.authorization?.startsWith('Bearer ')
    ? socket.handshake.headers.authorization.split(' ')[1]
    : null;
  const token = authToken || headerToken;

  if (!token) {
    throw new Error('Authentication token is required.');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

const userCanAccessEvent = async (userId, eventId) => {
  const result = await query(
    `SELECT 1
     FROM events e
     LEFT JOIN event_members em ON em.event_id = e.id
     WHERE e.id = $1
       AND (e.created_by = $2 OR em.user_id = $2)
     LIMIT 1`,
    [eventId, userId]
  );
  return result.rows.length > 0;
};

const buildSocketServer = (httpServer, corsOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const decoded = verifySocketToken(socket);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired socket token.'));
    }
  });

  io.on('connection', (socket) => {
    // Join a single event room after auth + membership checks.
    socket.on('join_event', async ({ eventId }) => {
      try {
        if (!eventId) return;
        const allowed = await userCanAccessEvent(socket.user.id, eventId);
        if (!allowed) {
          socket.emit('room_error', { eventId, message: 'Access denied for this room.' });
          return;
        }
        socket.join(eventRoom(eventId));
        socket.emit('joined_event', { eventId });
      } catch (err) {
        socket.emit('room_error', { eventId, message: 'Unable to join room.' });
      }
    });

    socket.on('leave_event', ({ eventId }) => {
      if (!eventId) return;
      socket.leave(eventRoom(eventId));
      socket.emit('left_event', { eventId });
    });
  });

  setIO(io);
  return io;
};

module.exports = { buildSocketServer, eventRoom };
