/**
 * Winston Logger Configuration
 * 
 * Structured logging with different formats for development and production.
 */

import winston from 'winston';
import config from '../config.js';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom format for development (human-readable)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
});

// Create logger instance
const logger = winston.createLogger({
    level: config.logging.level,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    ),
    defaultMeta: { service: 'phishguard-api' },
    transports: [
        new winston.transports.Console({
            format: config.isProduction
                ? json()
                : combine(colorize(), devFormat),
        }),
    ],
    // Prevent logging sensitive information
    exitOnError: false,
});

// Add file transport in production
if (config.isProduction) {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));

    logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}

export default logger;
