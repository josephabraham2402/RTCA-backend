const express = require('express');
const router = express.Router();
const { searchUsers, getFriendRequests, sendFriendRequest, respondFriendRequest, getFriends, removeFriend, blockUser, toggleMute, getMutedChats } = require('../Controllers/userController');
const { protect } = require('../Middleware/authMiddleware');

router.use(protect); // All user routes require authentication

router.get('/search', searchUsers);
router.get('/friend-requests', getFriendRequests);
router.post('/friend-requests', sendFriendRequest);
router.post('/friend-requests/respond', respondFriendRequest);
router.get('/friends', getFriends);
router.delete('/friends/:friendId', removeFriend);
router.post('/block', blockUser);
router.get('/muted', getMutedChats);
router.post('/mute', toggleMute);

module.exports = router;
