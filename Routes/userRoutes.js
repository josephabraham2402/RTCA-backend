const express = require('express');
const router = express.Router();
const { searchUsers, getFriendRequests, sendFriendRequest, respondFriendRequest, getFriends } = require('../Controllers/userController');
const { protect } = require('../Middleware/authMiddleware');

router.use(protect); // All user routes require authentication

router.get('/search', searchUsers);
router.get('/friend-requests', getFriendRequests);
router.post('/friend-requests', sendFriendRequest);
router.post('/friend-requests/respond', respondFriendRequest);
router.get('/friends', getFriends);

module.exports = router;
