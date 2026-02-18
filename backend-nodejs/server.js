/**
 * PhishGuard API Server
 * 
 * Security-hardened Express server for AI-powered phishing email detection.
 * Implements defense-in-depth principles with rate limiting, input validation,
 * and comprehensive error handling.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/security.js';
import analyzeRouter from './routes/analyze.js';
import healthRouter from './routes/health.js';

const app = express();

// Trust proxy for accurate IP detection behind load balancers
app.set('trust proxy', 1);

// Security middleware - Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
}));

// Custom security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (config.security.allowedOrigins.includes(origin) ||
            config.security.allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser with size limit
app.use(express.json({
    limit: config.security.maxRequestSize,
    strict: true,
}));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    });

    next();
});

// Health check endpoint (no rate limiting)
app.use('/health', healthRouter);

// API routes with rate limiting
app.use('/analyze', analyzeRouter);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'PhishGuard API',
        version: '2.0.0',
        status: 'operational',
        engine: 'Node.js/Express',
        documentation: '/health',
    });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
    logger.info({
        message: `PhishGuard API server started`,
        environment: config.env,
        host: config.server.host,
        port: config.server.port,
        aiEnabled: config.ai.enabled,
    });

    if (!config.ai.enabled) {
        logger.warn('AI features disabled - running in heuristics-only mode');
    }
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

export default app;
