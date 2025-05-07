const jwt = require('jsonwebtoken');
const knex = require('../db/knex.js'); // Ensure you have your knex instance configured and exported

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log(`AuthMiddleware: authenticateToken called for path: ${req.path}`);

    if (token == null) {
        console.warn("AuthMiddleware: No token provided.");
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("AuthMiddleware: Token decoded:", decoded);

        if (!decoded.userId) {
            console.warn("AuthMiddleware: Token does not contain userId.");
            return res.status(401).json({ message: 'Unauthorized: Invalid token payload.' });
        }

        const userDetails = await knex('users')
            .leftJoin('roles', 'users.role_id', 'roles.id')
            .where({ 'users.id': decoded.userId })
            .select(
                'users.id',
                'users.username',
                'users.employee_id',
                'users.is_active',
                'users.first_name',
                'users.last_name',
                'users.email',
                'users.role_id',
                // 'users.store_id', // REMOVED - store_id is not directly on users table
                'roles.name as role_name'
            )
            .first();

        if (!userDetails) {
            console.warn(`AuthMiddleware: User not found for ID: ${decoded.userId}`);
            return res.status(401).json({ message: 'Unauthorized: User not found.' });
        }

        if (!userDetails.is_active) {
            console.warn(`AuthMiddleware: User ${userDetails.username} is not active.`);
            return res.status(403).json({ message: 'Forbidden: User account is inactive.' });
        }

        // Fetch associated store IDs from user_stores table
        const storeAssociations = await knex('user_stores')
            .where({ user_id: userDetails.id })
            .select('store_id');

        userDetails.associated_store_ids = storeAssociations.map(sa => sa.store_id);
        console.log(`AuthMiddleware: User ${userDetails.username} associated store IDs:`, userDetails.associated_store_ids);


        const permissionsResult = await knex('role_permissions')
            .join('permissions', 'role_permissions.permission_id', 'permissions.id')
            .where({ role_id: userDetails.role_id })
            .select('permissions.name as permission_name');

        userDetails.permissions = permissionsResult.map(p => p.permission_name);
        console.log(`AuthMiddleware: User ${userDetails.username} (Role: ${userDetails.role_name}) permissions:`, userDetails.permissions);

        req.user = userDetails;
        console.log("AuthMiddleware: Authentication successful. req.user populated.");
        next();

    } catch (err) {
        let status = 500;
        let message = "Internal server error: Could not process authentication.";
        let errorType = err.name || "UnknownError";

        if (err instanceof jwt.JsonWebTokenError) {
            status = 401; // Or 403 if preferred for token errors
            message = `Unauthorized: ${err.message}`;
            console.warn("AuthMiddleware: JWT Error -", err.message);
        } else if (err.name === 'TokenExpiredError') {
            status = 401;
            message = 'Unauthorized: Token has expired.';
            console.warn("AuthMiddleware: Token has expired.");
        } else if (err.code && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) { // Example DB connection errors
            status = 503; // Service Unavailable
            message = "Service unavailable: Could not connect to database.";
            console.error("AuthMiddleware: Database connection error:", err);
        } else {
            // For other errors, including potential Knex/SQL errors not caught by specific checks
            console.error("AuthMiddleware: Unhandled error during token processing or user/permission fetch:", err);
            // Keep generic message for client, log specific error on server
        }
        
        return res.status(status).json({ message: message, errorType: errorType });
    }
};

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