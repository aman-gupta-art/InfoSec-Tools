const express = require('express');
const controller = require('../controllers/server.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes (for testing purposes)
router.post('/test-seed', controller.seedServers); // Public seed endpoint for testing

// Public routes (with auth)
router.get('/', verifyToken, controller.findAll);
router.get('/dashboard-stats', verifyToken, controller.getDashboardStats);
router.get('/import-template', verifyToken, controller.getImportTemplate);
router.get('/export', verifyToken, controller.exportServers);
router.get('/filter-options', verifyToken, controller.getDistinctValues);
router.get('/:id', verifyToken, controller.findOne);

// Admin only routes
router.post('/', [verifyToken, isAdmin], controller.create);
router.put('/:id', [verifyToken, isAdmin], controller.update);
router.delete('/clear-all', [verifyToken, isAdmin], controller.clearAll);
router.delete('/:id', [verifyToken, isAdmin], controller.delete);
router.post('/import', [verifyToken, isAdmin], controller.upload.single('file'), controller.importServers);

// Seed route (admin only)
router.post('/seed', [verifyToken, isAdmin], controller.seedServers);

module.exports = router; 