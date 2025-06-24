const express = require('express');
const controller = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Get current user profile
router.get('/profile', verifyToken, controller.getCurrentUser);

// Admin routes - protected by middleware
router.get('/', [verifyToken, isAdmin], controller.findAll);
router.get('/:id', [verifyToken, isAdmin], controller.findOne);
router.put('/:id', [verifyToken, isAdmin], controller.update);
router.delete('/:id', [verifyToken, isAdmin], controller.delete);
router.post('/:id/reset-password', [verifyToken, isAdmin], controller.resetPassword);

module.exports = router; 