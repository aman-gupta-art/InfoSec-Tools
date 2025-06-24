const express = require('express');
const controller = require('../controllers/activityLog.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Admin only routes
router.get('/', [verifyToken, isAdmin], controller.findAll);
router.get('/statistics', [verifyToken, isAdmin], controller.getStatistics);
router.get('/export', [verifyToken, isAdmin], controller.exportLogs);
router.get('/:id', [verifyToken, isAdmin], controller.findOne);
router.delete('/clear-all', [verifyToken, isAdmin], controller.clearAll);

module.exports = router; 