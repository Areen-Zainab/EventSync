const { verifyBearerToken } = require('../middleware/authMiddleware');
const {
  getEventAccessForSocket,
  createMessageViaSocket,
  togglePinnedViaSocket,
  markMessageReadsViaSocket,
  getMentionPayload,
} = require('../controllers/eventModuleController');

const roomName = (eventId) => `event:${eventId}`;

const extractToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken && typeof authToken === 'string') return authToken;

  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
};

const initializeChatSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error('No token provided.'));
      }
      const decoded = verifyBearerToken(token);
      socket.user = decoded;
      return next();
    } catch (error) {
      return next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('chat:joinRoom', async (payload, ack) => {
      try {
        const eventId = payload?.eventId;
        const allowed = await getEventAccessForSocket({ eventId, userId: socket.user.id });
        if (!allowed) {
          if (typeof ack === 'function') ack({ success: false, message: 'Event not found.' });
          return;
        }
        socket.join(roomName(eventId));
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        if (typeof ack === 'function') ack({ success: false, message: error.message });
      }
    });

    socket.on('chat:leaveRoom', (payload, ack) => {
      const eventId = payload?.eventId;
      socket.leave(roomName(eventId));
      if (typeof ack === 'function') ack({ success: true });
    });

    socket.on('chat:newMessage', async (payload, ack) => {
      try {
        const eventId = payload?.eventId;
        const message = payload?.message;
        const parentMessageId = payload?.parent_message_id || null;
        const { messagePayload, mentionUserIds } = await createMessageViaSocket({
          eventId,
          userId: socket.user.id,
          message,
          parentMessageId,
        });

        io.to(roomName(eventId)).emit('chat:newMessage', messagePayload);
        if (mentionUserIds.length > 0) {
          const mentionPayload = await getMentionPayload({ eventId, messagePayload, mentionUserIds });
          io.to(roomName(eventId)).emit('chat:mentionPing', mentionPayload);
        }
        if (typeof ack === 'function') ack({ success: true, message: messagePayload });
      } catch (error) {
        if (typeof ack === 'function') ack({ success: false, message: error.message });
      }
    });

    socket.on('chat:messagePinned', async (payload, ack) => {
      try {
        const eventId = payload?.eventId;
        const messageId = payload?.messageId;
        const message = await togglePinnedViaSocket({ eventId, userId: socket.user.id, messageId });
        if (!message) {
          if (typeof ack === 'function') ack({ success: false, message: 'Message not found.' });
          return;
        }
        io.to(roomName(eventId)).emit('chat:messagePinned', message);
        if (typeof ack === 'function') ack({ success: true, message });
      } catch (error) {
        if (typeof ack === 'function') ack({ success: false, message: error.message });
      }
    });

    socket.on('chat:messageRead', async (payload, ack) => {
      try {
        const eventId = payload?.eventId;
        const messageIds = Array.isArray(payload?.message_ids) ? payload.message_ids : [];
        const readIds = await markMessageReadsViaSocket({ eventId, userId: socket.user.id, messageIds });
        io.to(roomName(eventId)).emit('chat:messageRead', {
          event_id: eventId,
          message_ids: readIds,
          user_id: socket.user.id,
        });
        if (typeof ack === 'function') ack({ success: true, message_ids: readIds });
      } catch (error) {
        if (typeof ack === 'function') ack({ success: false, message: error.message });
      }
    });
  });
};

module.exports = { initializeChatSocket, roomName };
