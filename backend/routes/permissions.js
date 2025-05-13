const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
// const { authorizePermissions } = require('../middleware/authMiddleware');
const permissionController = require('../controllers/permissionController');
const permissionCategoryController = require('../controllers/permissionCategoryController'); // For categories route

const createPermissionsRouter = (knex) => { // knex parameter might be unused
    const router = express.Router();

    router.get('/', authenticateToken, permissionController.getStructuredPermissions);
    
    // Moved /categories to permissionCategoryController, but if you want it here for namespacing:
    // GET /api/permissions/categories - Fetch all permission categories for forms
    router.get('/categories', authenticateToken, permissionCategoryController.getAllPermissionCategories); // Or a dedicated controller method if different logic

    router.get('/list-all', authenticateToken, permissionController.getFlatListOfPermissions);
    router.get('/:id', authenticateToken, permissionController.getPermissionById);
    router.post('/', authenticateToken, /* authorizePermissions(['permission:create']), */ permissionController.createPermission);
    router.put('/:id', authenticateToken, /* authorizePermissions(['permission:update']), */ permissionController.updatePermission);
    router.delete('/:id', authenticateToken, /* authorizePermissions(['permission:delete']), */ permissionController.deletePermission);

    return router;
};

module.exports = createPermissionsRouter;