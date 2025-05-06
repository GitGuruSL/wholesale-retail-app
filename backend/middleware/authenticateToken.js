const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        console.log("AuthenticateToken Middleware: No token provided.");
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET is not defined for token verification in authenticateToken middleware.");
        return res.status(500).json({ message: "Internal server error: Authentication configuration issue (secret missing)." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.warn("AuthenticateToken Middleware: JWT verification failed. Error:", err.name, "-", err.message);
            let status = 403;
            let message = 'Forbidden: Invalid or expired token.';
            if (err.name === 'TokenExpiredError') {
                message = 'Forbidden: Token has expired.';
            } else if (err.name === 'JsonWebTokenError') {
                message = `Forbidden: Token is invalid (${err.message}).`;
            }
            return res.status(status).json({ message: message, errorType: err.name });
        }
        
        req.user = userPayload; 
        console.log("AuthenticateToken Middleware: Token verified for user:", req.user.username || req.user.userId);
        next();
    });
};

module.exports = authenticateToken;