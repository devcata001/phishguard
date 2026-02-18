/**
 * Configuration Management for PhishGuard API
 * 
 * Environment-based configuration with secure defaults.
 * Validates required environment variables and provides typed config object.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

/**
 * Parse comma-separated string into array
 * @param {string} value - Comma-separated values
 * @param {Array} defaultValue - Default array if value is empty
 * @returns {Array}
 */
const parseArray = (value, defaultValue = []) => {
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(Boolean);
};

/**
 * Application configuration object
 */
const config = {
    // Environment
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',
    isTesting: process.env.NODE_ENV === 'testing',

    // Server
    server: {
        port: parseInt(process.env.PORT || '5000', 10),
        host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
    },

    // Security
    security: {
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb',
        maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH || '100000', 10),
        rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '30', 10),
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        allowedOrigins: parseArray(
            process.env.ALLOWED_ORIGINS,
            ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']
        ),
    },

    // AI Integration
    ai: {
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        enabled: !!process.env.GEMINI_API_KEY,
        timeout: 30000, // 30 seconds
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
    },

    // Risk Thresholds
    risk: {
        highThreshold: 70,
        suspiciousThreshold: 40,
        safeThreshold: 0,
    },
};

/**
 * Validate critical configuration
 */
const validateConfig = () => {
    const errors = [];

    if (config.server.port < 1 || config.server.port > 65535) {
        errors.push('Invalid PORT: must be between 1 and 65535');
    }

    if (config.security.maxTextLength < 1000) {
        errors.push('Invalid MAX_TEXT_LENGTH: must be at least 1000');
    }

    if (config.security.rateLimitRequests < 1) {
        errors.push('Invalid RATE_LIMIT_REQUESTS: must be at least 1');
    }

    if (!config.ai.geminiApiKey && config.isProduction) {
        console.warn('WARNING: GEMINI_API_KEY not set - AI features disabled');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
};

// Validate on load
validateConfig();

export default config;
