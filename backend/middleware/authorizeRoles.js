// Example structure for backend/middleware/authorizeRoles.js

const ROLES = require('../utils/roles'); // Adjust path if needed

// This function takes allowed roles and returns the middleware function
const authorizeRoles = (...allowedRoles) => {
  // This is the actual middleware function
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      console.warn('Authorization check failed: req.user or req.user.role missing.');
      return res.status(403).json({ message: 'Forbidden: Role information missing.' });
    }

    const userRole = req.user.role;

    // Check if user's role is included in the allowed roles
    // Or if GLOBAL_ADMIN is allowed (implicitly allows GLOBAL_ADMIN)
    // Or if the user IS a GLOBAL_ADMIN (they can do anything)
    const isAllowed = allowedRoles.includes(userRole) ||
                      allowedRoles.includes(ROLES.GLOBAL_ADMIN) || // If GLOBAL_ADMIN is explicitly allowed for the route
                      userRole === ROLES.GLOBAL_ADMIN; // If the user IS a GLOBAL_ADMIN

    if (!isAllowed) {
      console.warn(`Authorization failed: User role '${userRole}' not in allowed roles [${allowedRoles.join(', ')}] for ${req.method} ${req.originalUrl}`);
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
    }

    // User has the required role, proceed to the next middleware/route handler
    next();
  };
};

module.exports = authorizeRoles; // Export the function that returns the middleware