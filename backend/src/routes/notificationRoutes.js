const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
