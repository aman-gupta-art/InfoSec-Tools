const express = require('express');
const router = express.Router();
const pimServerController = require('../controllers/pimServer.controller.js');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Create a new PIM Server (admin only)
router.post('/', isAdmin, pimServerController.create);

// Retrieve all PIM Servers
router.get('/', pimServerController.findAll);

// Get distinct values for filter options
router.get('/filter-options', pimServerController.getFilterOptions);

// Get import template
router.get('/import-template', isAdmin, pimServerController.getImportTemplate);

// Export PIM Servers to Excel
router.get('/export', pimServerController.exportToExcel);

// Import PIM Servers from Excel (admin only)
router.post('/import', isAdmin, upload.single('file'), pimServerController.importFromExcel);

// Clear all PIM Servers (admin only)
router.delete('/clear-all', isAdmin, pimServerController.deleteAll);

// Retrieve a single PIM Server with id
router.get('/:id', pimServerController.findOne);

// Update a PIM Server with id (admin only)
router.put('/:id', isAdmin, pimServerController.update);

// Delete a PIM Server with id (admin only)
router.delete('/:id', isAdmin, pimServerController.delete);

module.exports = router; 