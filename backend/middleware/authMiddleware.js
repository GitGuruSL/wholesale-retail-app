const jwt = require('jsonwebtoken');
const knex = require('../db/knex.js'); // Ensure you have your knex instance configured and exported

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        console.log('[AuthMiddleware] No token provided.');
        return res.status(401).json({ message: 'No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedJwtPayload) => {
        if (err) {
            console.error('[AuthMiddleware] JWT Error:', err.message);
            // Differentiate between expired and invalid token for better client feedback
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired. Please log in again.' });
            }
            return res.status(403).json({ message: 'Invalid token.' });
        }

        // The 'decodedJwtPayload' is the object you signed in auth.js
        // It contains: userId, username, roleId, roleName, permissions, storeId
        
        // Construct req.user to match expectations of downstream routes (e.g., inventoryRoutes.js)
        req.user = {
            user_id: decodedJwtPayload.userId, // Map to user_id if routes expect that
            username: decodedJwtPayload.username,
            role_id: decodedJwtPayload.roleId,   // Map to role_id
            role_name: decodedJwtPayload.roleName, // Keep as role_name
            permissions: decodedJwtPayload.permissions,
            store_id: decodedJwtPayload.storeId // <<< CRITICAL: Map storeId from token to store_id
            // Add other fields from decodedJwtPayload if needed by other routes
        };
        
        // console.log('[AuthMiddleware] Token verified. req.user set:', JSON.stringify(req.user, null, 2));
        next();
    });
}

// Function to check if user has ANY of the allowed roles
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role_name) {
            console.warn("AuthorizeRole: User or user role_name not found on request. Ensure authenticateToken runs first.");
            return res.status(403).json({ message: 'Forbidden: User role not available for authorization.' });
        }

        console.log(`AuthorizeRole: User: ${req.user.username}, Role: ${req.user.role_name}, Checking against allowed roles:`, allowedRoles);

        if (allowedRoles.includes(req.user.role_name)) {
            console.log(`AuthorizeRole: Role '${req.user.role_name}' is allowed.`);
            next(); // User has one of the allowed roles
        } else {
            console.warn(`AuthorizeRole: User ${req.user.username} (Role: ${req.user.role_name}) does NOT have any of the required roles:`, allowedRoles);
            return res.status(403).json({ message: 'Forbidden: You do not have the necessary role for this action.' });
        }
    };
};

const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            console.warn("CheckPermission: User or user permissions not found on request. Ensure authenticateToken runs first and populates permissions.");
            return res.status(403).json({ message: 'Forbidden: User permissions not available for authorization.' });
        }

        console.log(`CheckPermission: User: ${req.user.username}, Role: ${req.user.role_name}, Checking for permission: '${requiredPermission}'`);
        console.log(`CheckPermission: User's available permissions:`, req.user.permissions);

        if (req.user.permissions.includes(requiredPermission)) {
            console.log(`CheckPermission: Permission '${requiredPermission}' granted.`);
            next(); // User has the required permission
        } else {
            console.warn(`CheckPermission: User ${req.user.username} (Role: ${req.user.role_name}) does NOT have required permission: '${requiredPermission}'`);
            return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions for this action.' });
        }
    };
};

// Function to check if user has ANY of the required permissions
const authorizePermission = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions || !Array.isArray(req.user.permissions)) {
            console.warn("AuthorizePermission: User or user permissions not found or not an array. Ensure authenticateToken runs first.");
            return res.status(403).json({ message: 'Forbidden: User permissions not available for authorization.' });
        }
        
        console.log(`AuthorizePermission: User: ${req.user.username}, Role: ${req.user.role_name}, Checking for permissions:`, requiredPermissions);
        console.log(`AuthorizePermission: User's available permissions:`, req.user.permissions);

        const hasPermission = requiredPermissions.some(permission => req.user.permissions.includes(permission));

        if (hasPermission) {
            console.log(`AuthorizePermission: At least one required permission granted.`);
            next(); // User has at least one of the required permissions
        } else {
            console.warn(`AuthorizePermission: User ${req.user.username} (Role: ${req.user.role_name}) does NOT have any of the required permissions:`, requiredPermissions);
            return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions for this action.' });
        }
    };
};

module.exports = {
    authenticateToken,
    authorizeRole,       // <<< Added authorizeRole to exports
    checkPermission,
    authorizePermission,
};