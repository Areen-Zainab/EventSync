const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  getInvitations,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  acceptEventInvite,
  rejectEventInvite,
  getPreferences,
  updatePreferences,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
// Helper to ensure missing handlers don't crash the router registration
const ensureHandler = (fn, name) => {
  if (typeof fn === 'function') return fn;
  console.warn(`notificationRoutes: handler ${name} is undefined — registering fallback 500 responder.`);
  return (req, res) => res.status(500).json({ success: false, message: `Handler ${name} not available` });
};

router.get('/', ensureHandler(getNotifications, 'getNotifications'));
router.get('/invitations', ensureHandler(getInvitations, 'getInvitations'));
router.get('/unread-count', ensureHandler(getUnreadCount, 'getUnreadCount'));
router.get('/preferences', ensureHandler(getPreferences, 'getPreferences'));
router.put('/preferences', ensureHandler(updatePreferences, 'updatePreferences'));
router.patch('/mark-all-read', ensureHandler(markAllAsRead, 'markAllAsRead'));
router.post('/:id/accept', ensureHandler(acceptEventInvite, 'acceptEventInvite'));
router.post('/:id/reject', ensureHandler(rejectEventInvite, 'rejectEventInvite'));
router.patch('/:id/read', ensureHandler(markAsRead, 'markAsRead'));
router.delete('/:id', ensureHandler(deleteNotification, 'deleteNotification'));

module.exports = router;
