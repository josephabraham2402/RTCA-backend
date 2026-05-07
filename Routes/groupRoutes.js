const express = require('express');
const router = express.Router();
const { createGroup, getGroups } = require('../Controllers/groupController');
const { protect } = require('../Middleware/authMiddleware');

router.use(protect); // All group routes require authentication

router.post('/', createGroup);
router.get('/', getGroups);

module.exports = router;
