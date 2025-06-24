const express = require('express');
const controller = require('../controllers/socTracker.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Routes accessible to all authenticated users (readonly access)
router.get('/', verifyToken, controller.findAll);
router.get('/:id', verifyToken, controller.findOne);
router.get('/parent/:parentId', verifyToken, controller.getItemsByParent);

// Routes accessible only to admins
router.post('/', [verifyToken, isAdmin], controller.create);
router.put('/:id', [verifyToken, isAdmin], controller.update);
router.delete('/:id', [verifyToken, isAdmin], controller.delete);

module.exports = router; 