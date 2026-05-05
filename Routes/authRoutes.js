const express = require('express');
const router = express.Router();
const { signup, login } = require('../Controllers/authController');
const { body } = require('express-validator');

// Validation rules
const signupValidation = [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 })
];

const loginValidation = [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
];

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);

module.exports = router;
