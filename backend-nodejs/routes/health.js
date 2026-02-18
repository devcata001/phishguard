/**
 * Health Check Route
 * 
 * GET /health - API health and status endpoint
 */

import express from 'express';
import config from '../config.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Track uptime
const startTime = Date.now();

/**
 * GET /health
 * Returns API health status and configuration info
 */
router.get('/', (req, res) => {
    const uptime = Date.now() - startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);

    const healthStatus = {
        status: 'healthy',
        service: 'PhishGuard API',
        version: '2.0.0',
        engine: 'Node.js/Express',
        uptime: {
            milliseconds: uptime,
            seconds: uptimeSeconds,
            formatted: formatUptime(uptimeSeconds),
        },
        features: {
            ai_analysis: config.ai.enabled,
            heuristic_analysis: true,
            rate_limiting: true,
            input_validation: true,
        },
        configuration: {
            environment: config.env,
            max_text_length: config.security.maxTextLength,
            rate_limit: `${config.security.rateLimitRequests} requests per ${config.security.rateLimitWindowMs / 1000}s`,
        },
        endpoints: {
            analyze: 'POST /analyze',
            health: 'GET /health',
        },
        timestamp: new Date().toISOString(),
    };

    logger.debug('Health check requested');
    res.json(healthStatus);
});

/**
 * Format uptime in human-readable format
 */
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
};

export default router;
