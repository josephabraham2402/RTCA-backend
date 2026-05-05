const express = require('express');
const router = express.Router();
const messageController = require('../Controllers/messageController');
const { protect } = require('../Middleware/authMiddleware');

router.get('/:userId', protect, messageController.getMessages);
router.post('/mark-seen', protect, messageController.markMessagesAsSeen);

module.exports = router;
