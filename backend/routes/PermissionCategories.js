const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
// const { authorizePermissions } = require('../middleware/authMiddleware'); // Uncomment if you implement this
const permissionCategoryController = require('../controllers/permissionCategoryController');

const createPermissionCategoriesRouter = (knex) => { // knex parameter might be unused
    const router = express.Router();

    router.get('/', authenticateToken, /* authorizePermissions(['system:manage_permission_categories']), */ permissionCategoryController.getAllPermissionCategories);
    router.get('/:id', authenticateToken, /* authorizePermissions(['system:manage_permission_categories']), */ permissionCategoryController.getPermissionCategoryById);
    router.post('/', authenticateToken, /* authorizePermissions(['system:manage_permission_categories']), */ permissionCategoryController.createPermissionCategory);
    router.put('/:id', authenticateToken, /* authorizePermissions(['system:manage_permission_categories']), */ permissionCategoryController.updatePermissionCategory);
    router.delete('/:id', authenticateToken, /* authorizePermissions(['system:manage_permission_categories']), */ permissionCategoryController.deletePermissionCategory);

    return router;
};

module.exports = createPermissionCategoriesRouter;