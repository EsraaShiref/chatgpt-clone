// middleware/errorHandler.js - Error Handling Middleware

const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', {
        message: err.message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let error = {
        success: false,
        error: message,
        path: req.path,
        method: req.method
    };

    // Specific error handling

    // JSON parse error
    if (err instanceof SyntaxError && 'body' in err) {
        statusCode = 400;
        message = 'Invalid JSON in request body';
    }

    // Database error
    if (err.message?.includes('SQLITE')) {
        statusCode = 500;
        message = 'Database error occurred';
    }

    // Network error
    if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Service unavailable';
    }

    // Timeout error
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        statusCode = 504;
        message = 'Request timeout';
    }

    // API error
    if (err.response?.data) {
        statusCode = err.response.status || 500;
        message = err.response.data.error?.message || err.message;
    }

    error.error = message;
    error.statusCode = statusCode;

    // Don't expose stack trace in production
    if (process.env.NODE_ENV === 'development') {
        error.stack = err.stack;
    }

    res.status(statusCode).json(error);
};

module.exports = errorHandler;
