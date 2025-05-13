const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
// const { authorizePermissions } = require('../middleware/authMiddleware'); // Your permission constants
const roleController = require('../controllers/roleController');

const createRolesRouter = (knex) => { // knex parameter might be unused if controller handles its own
    const router = express.Router();

    router.get('/', authenticateToken, /* authorizePermissions(['role:read']), */ roleController.getAllRoles);
    router.get('/:id', authenticateToken, /* authorizePermissions(['role:read']), */ roleController.getRoleById);
    router.post('/', authenticateToken, /* authorizePermissions(['role:create']), */ roleController.createRole);
    router.put('/:id', authenticateToken, /* authorizePermissions(['role:update']), */ roleController.updateRole);
    router.delete('/:id', authenticateToken, /* authorizePermissions(['role:delete']), */ roleController.deleteRole);
    
    // Assign/Update permissions for a specific role
    router.post('/:roleId/permissions', authenticateToken, /* authorizePermissions(['role:assign_permissions']), */ roleController.assignPermissionsToRole);

    return router;
};

module.exports = createRolesRouter;