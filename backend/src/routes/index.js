const express = require('express');
const router = express.Router();

const dashboardRoutes = require('./dashboardRoutes');
const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const taskRoutes = require('./taskRoutes');
const notificationRoutes = require('./notificationRoutes');

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/events', eventRoutes);
router.use('/tasks', taskRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
