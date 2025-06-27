const express = require('express');
const router = express.Router();
const pimUserController = require('../controllers/pimUser.controller.js');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware.js');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// Apply verifyToken middleware to all routes
router.use(verifyToken);

// IMPORTANT: Define specific routes before parameterized routes
// Template download - this must come before the /:id route
router.get('/template', isAdmin, pimUserController.getImportTemplate);

// Filter options for dropdowns
router.get('/filter-options', pimUserController.getFilterOptions);

// Export PIM users to Excel
router.get('/export', pimUserController.export);

// Import PIM users from Excel
router.post('/import', isAdmin, upload.single('file'), pimUserController.import);

// DELETE all PIM users
router.delete('/clear-all', isAdmin, pimUserController.deleteAll);

// Routes accessible by both admin and regular users
// GET all PIM users with pagination, filtering, and search
router.get('/', pimUserController.findAll);

// GET a single PIM user by ID - this must come after all other GET routes
router.get('/:id', pimUserController.findOne);

// Routes requiring admin access
// POST a new PIM user
router.post('/', isAdmin, pimUserController.create);

// PUT to update a PIM user
router.put('/:id', isAdmin, pimUserController.update);

// DELETE a PIM user
router.delete('/:id', isAdmin, pimUserController.delete);

module.exports = router; 