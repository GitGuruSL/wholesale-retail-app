// filepath: backend/middleware/notFoundHandler.js
/**
 * Middleware to handle requests for routes that don't exist (404).
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({ message: `Not Found - Cannot ${req.method} ${req.originalUrl}` });
}

module.exports = notFoundHandler;