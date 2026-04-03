const express = require('express');
const router = express.Router();
const { signup, login, getCurrentUser, updateCurrentUser, deleteCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getCurrentUser);
router.put('/me', protect, updateCurrentUser);
router.delete('/me', protect, deleteCurrentUser);

module.exports = router;
