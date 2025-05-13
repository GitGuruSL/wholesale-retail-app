// Example structure for backend/middleware/checkPermission.js

// const ROLES = require('../utils/roles'); // Keep if you implement role checks

// This function now takes allowedRoles and an array of requiredPermissions
const authorizeAccess = (allowedRoles, requiredPermissions) => {
  // This is the actual middleware function
  return (req, res, next) => {
    if (!req.user || !req.user.permissions || !Array.isArray(req.user.permissions)) {
      console.warn('[AuthorizeAccess] Permission check failed: req.user or req.user.permissions missing or not an array.');
      return res.status(403).json({ message: 'Forbidden: User permissions not available.' });
    }

    console.log('[AuthorizeAccess] req.user received:', JSON.stringify(req.user, null, 2));
    console.log('[AuthorizeAccess] requiredPermissions received:', requiredPermissions);

    const userPermissions = req.user.permissions;
    // const userRoles = req.user.roles || []; // Assuming roles are on req.user like ['global_admin', 'another_role']

    // Optional: Role check
    // if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    //   const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
    //   if (!hasRequiredRole) {
    //     console.warn(
    //       `[AuthorizeAccess] Role check failed: User (ID: ${req.user.id}, Roles: ${userRoles.join(', ')}) ` +
    //       `does not have one of the required roles: [${allowedRoles.join(', ')}] for ${req.method} ${req.originalUrl}`
    //     );
    //     return res.status(403).json({ message: `Forbidden: Insufficient role. Requires one of: ${allowedRoles.join(', ')}.` });
    //   }
    // }

    // Permission check
    if (requiredPermissions && Array.isArray(requiredPermissions) && requiredPermissions.length > 0) {
      let allPermissionsMet = true;
      let missingPermission = null;

      for (const requiredPerm of requiredPermissions) {
        if (typeof requiredPerm !== 'string' || requiredPerm.trim() === '') {
            console.error(`[AuthorizeAccess] CRITICAL: Route configured with an invalid permission: '${requiredPerm}'. This is a configuration error in your routes.`);
            return res.status(500).json({ message: `Server error: Route configured with invalid permission '${requiredPerm}'.` });
        }
        if (!userPermissions.includes(requiredPerm)) {
          allPermissionsMet = false;
          missingPermission = requiredPerm; // Store the specific permission that is missing
          break; 
        }
      }

      if (!allPermissionsMet) {
        console.warn(
          `[AuthorizeAccess] Permission check failed: User (ID: ${req.user.id}, Role: ${req.user.role_name || 'N/A'}) ` +
          `does not have required permission '${missingPermission}'. ` + // Use the identified missing permission
          `User permissions: [${userPermissions.join(', ')}] for ${req.method} ${req.originalUrl}`
        );
        return res.status(403).json({ message: `Forbidden: Requires permission '${missingPermission}'.` }); // Correctly show the missing permission
      }
    }
    next(); // User has all required permissions (and roles, if checked)
  };
};

module.exports = authorizeAccess; // Ensure this is the only export