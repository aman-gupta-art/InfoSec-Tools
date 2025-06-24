const express = require('express');
const controller = require('../controllers/auth.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/login', controller.login);

// Protected routes
router.post('/register', [verifyToken, isAdmin], controller.register);
router.post('/change-password', verifyToken, controller.changePassword);
router.post('/update-theme', verifyToken, controller.updateTheme);

module.exports = router; 