/**
 * Heuristic Detection Service
 * 
 * Combines keyword scanning, URL analysis, and behavioral indicators
 * for comprehensive phishing detection without AI.
 */

import { analyzeHeuristics } from './keywordService.js';
import { analyzeUrls, checkLinkMismatches } from './urlService.js';
import logger from '../utils/logger.js';

/**
 * Perform complete heuristic analysis
 */
export const analyzeHeuristic = (text) => {
    try {
        logger.debug('Starting heuristic analysis');

        // Keyword and behavioral analysis
        const keywordResult = analyzeHeuristics(text);

        // URL analysis
        const urlResult = analyzeUrls(text);

        // Link mismatch detection
        const mismatchResult = checkLinkMismatches(text);

        // Combine scores
        const totalScore = keywordResult.score + urlResult.score + mismatchResult.score;

        // Combine reasons
        const allReasons = [
            ...keywordResult.reasons,
            ...urlResult.reasons,
            ...mismatchResult.reasons,
        ];

        // Add metadata
        if (urlResult.urlCount > 0) {
            allReasons.push(`Contains ${urlResult.urlCount} URL(s)`);
        }

        logger.info(`Heuristic analysis complete: score=${totalScore}, factors=${allReasons.length}`);

        return {
            score: Math.min(totalScore, 100), // Cap at 100
            reasons: allReasons,
            metadata: {
                keyword_score: keywordResult.score,
                url_score: urlResult.score,
                mismatch_score: mismatchResult.score,
                url_count: urlResult.urlCount,
            },
        };

    } catch (error) {
        logger.error(`Heuristic analysis failed: ${error.message}`);
        throw new Error('Heuristic analysis failed');
    }
};
