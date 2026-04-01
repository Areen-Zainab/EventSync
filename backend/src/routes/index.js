const express = require('express');
const router = express.Router();

/**
 * @desc    Health check route to verify server status
 * @route   GET /api/health
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
