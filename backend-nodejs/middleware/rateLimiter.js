/**
 * Rate Limiting Middleware
 * 
 * Protects API from abuse with configurable rate limits per IP.
 * Uses express-rate-limit with memory store (use Redis in production for distributed systems).
 */

import rateLimit from 'express-rate-limit';
import config from '../config.js';
import logger from '../utils/logger.js';
import { getClientIp } from './security.js';

/**
 * Rate limiter for analyze endpoint
 */
export const analyzeLimiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitRequests,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers

    // Custom key generator with proxy support
    keyGenerator: (req) => getClientIp(req),

    // Custom handler for rate limit exceeded
    handler: (req, res) => {
        const clientIp = getClientIp(req);
        logger.warn(`Rate limit exceeded for IP: ${clientIp}`);

        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000),
        });
    },

    // Skip rate limiting in test environment
    skip: (req) => config.isTesting,
});

/**
 * Lenient rate limiter for health checks and general endpoints
 */
export const generalLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    skip: (req) => config.isTesting,
});
