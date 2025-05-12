// Example structure for backend/middleware/checkPermission.js

const ROLES = require('../utils/roles'); // Adjust path if needed

// This function takes a required permission string and returns the middleware function
const checkPermission = (requiredPermission) => {
  // This is the actual middleware function
  return (req, res, next) => {
    if (!req.user || !req.user.permissions || !Array.isArray(req.user.permissions)) {
      console.warn('Permission check failed: req.user or req.user.permissions missing or not an array.');
      return res.status(403).json({ message: 'Forbidden: User permissions not available.' });
    }

    const userPermissions = req.user.permissions;

    // Check if user's permissions array includes the required permission
    if (userPermissions.includes(requiredPermission)) {
      next(); // User has the required permission
    } else {
      // For debugging, log the user's role and all their permissions if the check fails
      console.warn(
        `Authorization failed: User (Role: ${req.user.role_name || 'N/A'}) ` +
        `does not have required permission '${requiredPermission}'. ` +
        `User permissions: [${userPermissions.join(', ')}] for ${req.method} ${req.originalUrl}`
      );
      return res.status(403).json({ message: `Forbidden: Requires permission '${requiredPermission}'.` });
    }
  };
};

module.exports = checkPermission; // Export the new checkPermission function