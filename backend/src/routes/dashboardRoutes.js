const express = require('express');
const { getDashboardOverview } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', getDashboardOverview);

module.exports = router;
