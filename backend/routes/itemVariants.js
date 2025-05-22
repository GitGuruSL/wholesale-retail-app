const express = require('express');
const router = express.Router();

// Ensure the path to itemController is correct
const itemController = require('../controllers/itemController');

// Ensure paths to middleware are correct
const { authenticateToken } = require('../middleware/authMiddleware');
const authorizeAccess = require('../middleware/authorizeRoles');

// Temporarily comment out or remove this route if the controller function is the issue
router.get(
    '/for-purchase',
    authenticateToken, // Make sure authenticateToken is a function
    authorizeAccess('item:read'), // Make sure this returns a function; 'item:read' permission seems appropriate
    itemController.getItemVariantsForPurchase // CRITICAL: This must be a valid function
);

module.exports = router;