const express = require('express');
const router = express.Router();
const { createEvent, getEvents, inviteMember } = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // all event routes require auth

router.post('/', createEvent);
router.get('/', getEvents);
router.post('/:id/invite', inviteMember);

module.exports = router;
