const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventMembers,
  inviteMember,
  updateEventMember,
  removeEventMember,
  getEventMessages,
  sendEventMessage,
  uploadMessageAttachments,
  pinEventMessage,
  markEventMessagesRead,
  getUnreadMentions,
  markMentionMessagesRead,
} = require('../controllers/eventModuleController');
const { protect } = require('../middleware/authMiddleware');
const { chatUpload } = require('../middleware/uploadMiddleware');

router.use(protect); // all event routes require auth

// Event CRUD
router.post('/', createEvent);
router.get('/', getEvents);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Event members
router.get('/:id/members', getEventMembers);
router.post('/:id/invite', inviteMember);
router.patch('/:id/members/:memberId', updateEventMember);
router.delete('/:id/members/:memberId', removeEventMember);

// Event chat
router.get('/:id/messages', getEventMessages);
router.post('/:id/messages', sendEventMessage);
router.post('/:id/messages/:messageId/attachments', chatUpload.array('files', 5), uploadMessageAttachments);
router.patch('/:id/messages/:messageId/pin', pinEventMessage);
router.post('/:id/messages/read', markEventMessagesRead);
router.get('/:id/mentions/unread', getUnreadMentions);
router.post('/:id/mentions/read', markMentionMessagesRead);

module.exports = router;
