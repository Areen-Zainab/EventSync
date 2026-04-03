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
	pinEventMessage,
	markMessagesAsRead,
} = require('../controllers/eventModuleController');
const { protect } = require('../middleware/authMiddleware');
const { uploadChatAttachment } = require('../middleware/chatUploadMiddleware');

router.use(protect); // all event routes require auth

router.post('/', createEvent);
router.get('/', getEvents);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

router.get('/:id/members', getEventMembers);
router.post('/:id/invite', inviteMember);
router.patch('/:id/members/:memberId', updateEventMember);
router.delete('/:id/members/:memberId', removeEventMember);

router.get('/:id/messages', getEventMessages);
router.post('/:id/messages', uploadChatAttachment.single('attachment'), sendEventMessage);
router.patch('/:id/messages/:messageId/pin', pinEventMessage);
router.post('/:id/messages/read', markMessagesAsRead);

module.exports = router;
