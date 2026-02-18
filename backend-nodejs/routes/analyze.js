/**
 * Analyze Route
 * 
 * POST /analyze - Email phishing detection endpoint
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateAnalyzeRequest } from '../middleware/validation.js';
import { analyzeLimiter } from '../middleware/rateLimiter.js';
import { analyzeEmail } from '../controllers/detectionController.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /analyze
 * Analyze email content for phishing indicators
 * 
 * Request body:
 * {
 *   "text": "email content here..."
 * }
 * 
 * Response:
 * {
 *   "risk_score": 85,
 *   "risk_level": "HIGH_RISK",
 *   "flags": ["reason1", "reason2"],
 *   "ai_analysis": { ... },
 *   "metadata": { ... }
 * }
 */
router.post(
    '/',
    analyzeLimiter,
    validateAnalyzeRequest,
    asyncHandler(async (req, res) => {
        const { text } = req.validatedBody;

        logger.info({
            message: 'Analysis request received',
            text_length: text.length,
            ip: req.ip,
        });

        // Perform analysis
        const result = await analyzeEmail(text);

        // Return result
        res.json(result);
    })
);

export default router;
