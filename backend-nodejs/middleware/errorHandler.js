/**
 * Error Handling Middleware
 * 
 * Centralized error handling with proper logging and safe error responses.
 * Prevents information leakage in production.
 */

import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
    // Default to 500 if no status code
    const statusCode = err.statusCode || 500;

    // Log error details
    if (statusCode >= 500) {
        logger.error({
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            ip: req.ip,
        });
    } else {
        logger.warn({
            message: err.message,
            path: req.path,
            method: req.method,
            status: statusCode,
        });
    }

    // Prepare error response
    const errorResponse = {
        error: getErrorName(statusCode),
        message: err.message || 'An error occurred',
    };

    // Add details in development mode
    if (config.isDevelopment && err.details) {
        errorResponse.details = err.details;
    }

    // Never expose stack traces in production
    if (config.isDevelopment && err.stack) {
        errorResponse.stack = err.stack;
    }

    // Handle specific error types
    if (err.name === 'ValidationError') {
        errorResponse.message = 'Invalid input data';
        return res.status(400).json(errorResponse);
    }

    if (err.type === 'entity.too.large') {
        errorResponse.message = 'Request payload too large';
        return res.status(413).json(errorResponse);
    }

    if (err.name === 'SyntaxError' && err.status === 400) {
        errorResponse.message = 'Invalid JSON format';
        return res.status(400).json(errorResponse);
    }

    // Generic response for unhandled errors (prevent information leakage)
    if (statusCode >= 500 && config.isProduction) {
        errorResponse.message = 'Internal server error. Please try again later.';
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * Get human-readable error name from status code
 */
const getErrorName = (statusCode) => {
    const errorNames = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        413: 'Payload Too Large',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        503: 'Service Unavailable',
    };
    return errorNames[statusCode] || 'Error';
};

/**
 * Async handler wrapper to catch errors in async routes
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
