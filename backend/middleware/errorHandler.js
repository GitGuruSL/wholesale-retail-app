// filepath: backend/middleware/errorHandler.js
/**
 * Generic Express error handler middleware.
 * Logs the error and sends a generic error response.
 */
function errorHandler(err, req, res, next) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err); // Log the full error

    // Determine status code - use error's status or default to 500
    const statusCode = typeof err.status === 'number' ? err.status : 500;

    // Send a generic error response
    // Avoid sending detailed error messages in Itemion
    res.status(statusCode).json({
        message: err.message || 'An unexpected server error occurred.',
        // Optionally include stack trace in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
}

module.exports = errorHandler;