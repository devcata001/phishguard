/**
 * Security Middleware
 * 
 * Additional security headers and protections beyond Helmet.
 */

import logger from '../utils/logger.js';

/**
 * Add custom security headers
 */
export const securityHeaders = (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Control iframe embedding
    res.setHeader('X-Frame-Options', 'DENY');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
};

/**
 * Sanitize input to prevent injection attacks
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') {
        return input;
    }

    // Check for null bytes
    if (input.includes('\0')) {
        logger.warn('Null byte detected in input');
        throw new Error('Invalid characters in input');
    }

    return input.trim();
};

/**
 * Get client IP address with proxy support
 */
export const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
};
