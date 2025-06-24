const express = require('express');
const controller = require('../controllers/socTracker.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

const router = express.Router();

// Routes accessible to all authenticated users (readonly access)
router.get('/', verifyToken, controller.findAll);
router.get('/:id', verifyToken, controller.findOne);
router.get('/parent/:parentId', verifyToken, controller.getItemsByParent);

// Tracker table data routes (readonly for all authenticated users)
router.get('/:id/table-data', verifyToken, controller.getTableData);
router.get('/:id/template', verifyToken, controller.getTableTemplate);
router.get('/:id/export', verifyToken, controller.exportTableData);

// Routes accessible only to admins
router.post('/', [verifyToken, isAdmin], controller.create);
router.put('/:id', [verifyToken, isAdmin], controller.update);
router.delete('/:id', [verifyToken, isAdmin], controller.delete);

// Tracker table admin routes
router.post('/:id/headers/initialize', [verifyToken, isAdmin], controller.initializeHeaders);
router.put('/:id/headers', [verifyToken, isAdmin], controller.updateHeaders);
router.post('/:id/rows', [verifyToken, isAdmin], controller.createTableRow);
router.put('/:id/rows/:rowId', [verifyToken, isAdmin], controller.updateTableRow);
router.delete('/:id/rows/:rowId', [verifyToken, isAdmin], controller.deleteTableRow);
router.post('/:id/import', [verifyToken, isAdmin, upload.single('file')], controller.importTableData);

module.exports = router; 