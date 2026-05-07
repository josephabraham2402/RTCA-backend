const express = require('express');
const router = express.Router();
const { createGroup, getGroups, deleteGroup, addGroupMembers, removeGroupMember } = require('../Controllers/groupController');
const { protect } = require('../Middleware/authMiddleware');

router.use(protect); // All group routes require authentication

router.post('/', createGroup);
router.get('/', getGroups);
router.delete('/:id', deleteGroup);
router.post('/:id/members', addGroupMembers);
router.delete('/:id/members/:memberId', removeGroupMember);

module.exports = router;
