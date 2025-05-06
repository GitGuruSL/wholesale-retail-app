const jwt = require('jsonwebtoken');
const knex = require('knex')(require('../knexfile')[process.env.NODE_ENV || 'development']);
const ROLES = require('../utils/roles'); // Assuming ROLES are needed for authorizeRole

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        console.log("AuthMiddleware: No token provided.");
        return res.status(401).json({ message: 'Unauthorized: Access token is required.' });
    }

    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in authMiddleware.");
        return res.status(500).json({ message: "Internal server error: Authentication configuration issue." });
    }

    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await knex('users')
            .select(
                'id', 
                'username', 
                'role', 
                'employee_id',
                'first_name',
                'last_name',
                'email',
                'is_active'
            )
            .where({ id: decodedPayload.userId })
            .first();

        if (!user) {
            console.warn(`AuthMiddleware: User ID ${decodedPayload.userId} from token not found in database.`);
            return res.status(403).json({ message: 'Forbidden: Invalid user.' });
        }

        if (!user.is_active) {
            console.warn(`AuthMiddleware: User ${user.username} (ID: ${user.id}) is not active.`);
            return res.status(403).json({ message: 'Forbidden: User account is inactive.' });
        }

        req.user = user; 
        console.log(`AuthMiddleware: Token verified for user: ${user.username} (ID: ${user.id})`);
        next();
    } catch (err) {
        console.warn("AuthMiddleware: JWT verification or user fetch failed. Error:", err.name, "-", err.message);
        let status = 403;
        let message = 'Forbidden: Invalid or expired token.';
        if (err.name === 'TokenExpiredError') {
            message = 'Forbidden: Token has expired.';
        } else if (err.name === 'JsonWebTokenError') {
            message = `Forbidden: Token is invalid (${err.message}).`;
        } else {
            status = 500; 
            message = "Internal server error: Could not process authentication.";
            console.error("AuthMiddleware: Unhandled error during token processing or user fetch:", err);
        }
        return res.status(status).json({ message: message, errorType: err.name });
    }
};

const authorizeRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            console.warn("AuthorizeRole: User or user role not found on request. Ensure authenticateToken runs first.");
            return res.status(403).json({ message: 'Forbidden: User role not available for authorization.' });
        }

        const userRole = req.user.role;
        const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        if (rolesArray.includes(userRole)) {
            next(); // User has one of the required roles
        } else {
            console.warn(`AuthorizeRole: User ${req.user.username} (Role: ${userRole}) does not have required role(s): ${rolesArray.join(', ')}`);
            return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions.' });
        }
    };
};

module.exports = { 
    authenticateToken, 
    authorizeRole 
};