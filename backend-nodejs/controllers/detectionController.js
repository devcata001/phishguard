

import geminiAI from '../services/aiService.js';
import { analyzeHeuristic } from '../services/heuristicService.js';
import {
    combineScores,
    mergeRiskFactors,
    createAnalysisResult,
    validateScore,
} from '../utils/riskScorer.js';
import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * Main analysis function
 * Performs multi-layer phishing detection on any message type
 * Supports emails, SMS, chat messages, and social media content
 */
export const analyzeEmail = async (text) => {
    const startTime = Date.now();
    let aiResult = null;
    let heuristicResult = null;

    try {
        logger.info('Starting message analysis');

        // Run heuristic analysis (always)
        heuristicResult = analyzeHeuristic(text);
        logger.debug(`Heuristic analysis complete: score=${heuristicResult.score}`);

        // Run AI analysis if available
        if (config.ai.enabled) {
            try {
                aiResult = await geminiAI.analyze(text);
                logger.debug(`AI analysis complete: confidence=${aiResult.confidence}`);
            } catch (aiError) {
                // AI failure shouldn't break the entire analysis
                logger.warn(`AI analysis failed, falling back to heuristics only: ${aiError.message}`);
                aiResult = null;
            }
        }

        // Combine results
        const finalScore = validateScore(
            combineScores(aiResult, heuristicResult.score)
        );

        const riskFactors = mergeRiskFactors(
            aiResult,
            heuristicResult.reasons
        );

        // Create final result
        const result = createAnalysisResult(finalScore, riskFactors, aiResult);

        const duration = Date.now() - startTime;
        logger.info({
            message: 'Analysis complete',
            score: finalScore,
            risk_level: result.risk_level,
            duration: `${duration}ms`,
            ai_enabled: !!aiResult,
        });

        return result;

    } catch (error) {
        logger.error(`Message analysis failed: ${error.message}`);
        throw error;
    }
};

/**
 * Validate message content before analysis
 */
export const validateEmailContent = (text) => {
    if (typeof text !== 'string') {
        throw new Error('Invalid message content: must be a non-empty string');
    }

    if (text.trim().length === 0) {
        throw new Error('Message content cannot be empty');
    }

    if (text.length > config.security.maxTextLength) {
        throw new Error(`Message content too large: maximum ${config.security.maxTextLength} characters`);
    }

    return true;
};
