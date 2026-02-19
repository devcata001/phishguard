/**
 * Risk Scoring Utility
 * 
 * Calculates risk scores and levels based on detection results.
 * Combines AI and heuristic analysis for final risk assessment.
 */

import config from '../config.js';

/**
 * Risk level enumeration
 */
export const RiskLevel = {
    SAFE: 'SAFE',
    SUSPICIOUS: 'SUSPICIOUS',
    HIGH_RISK: 'HIGH_RISK',
};

/**
 * Calculate risk level from score
 */
export const calculateRiskLevel = (score) => {
    if (score >= config.risk.highThreshold) {
        return RiskLevel.HIGH_RISK;
    }
    if (score >= config.risk.suspiciousThreshold) {
        return RiskLevel.SUSPICIOUS;
    }
    return RiskLevel.SAFE;
};

/**
 * Combine AI and heuristic scores
 * 
 * Strategy:
 * - If AI is available, weight it more heavily (70% AI, 30% heuristic)
 * - If AI indicates high risk, boost overall score
 * - Strong heuristic signals can override weak AI output
 */
export const combineScores = (aiResult, heuristicScore) => {
    if (!aiResult) {
        // Heuristics only
        return Math.min(heuristicScore, 100);
    }

    // AI-enhanced scoring
    const aiScore = aiResult.phishingProbability * 100;

    // Weighted combination: 70% AI, 30% heuristic
    const baseScore = (aiScore * 0.7) + (heuristicScore * 0.3);

    // If both AI and heuristics agree on high risk, boost score
    if (aiScore >= 70 && heuristicScore >= 60) {
        return Math.min(baseScore * 1.15, 100);
    }

    // Never suppress suspicious heuristic findings with low AI probability
    if (heuristicScore >= config.risk.suspiciousThreshold) {
        return Math.min(Math.max(baseScore, heuristicScore), 100);
    }

    // If AI confidence is very high, trust it more
    if (aiResult.confidence >= 0.9) {
        return Math.min(aiScore, 100);
    }

    return Math.min(baseScore, 100);
};

/**
 * Merge risk factors from AI and heuristics
 */
export const mergeRiskFactors = (aiResult, heuristicReasons) => {
    const factors = [];

    // Add heuristic findings
    if (heuristicReasons && heuristicReasons.length > 0) {
        factors.push(...heuristicReasons);
    }

    // Add AI findings with confidence
    if (aiResult && aiResult.riskFactors && aiResult.riskFactors.length > 0) {
        const aiConfidence = Math.round(aiResult.confidence * 100);
        factors.push(
            `AI Analysis (${aiConfidence}% confidence): ${aiResult.riskFactors.join(', ')}`
        );
    }

    // Remove duplicates while preserving order
    return [...new Set(factors)];
};

/**
 * Create final analysis result
 */
export const createAnalysisResult = (score, riskFactors, aiResult = null) => {
    const riskLevel = calculateRiskLevel(score);

    return {
        risk_score: Math.round(score),
        risk_level: riskLevel,
        flags: riskFactors,
        ai_analysis: aiResult ? {
            enabled: true,
            confidence: Math.round(aiResult.confidence * 1000) / 1000,
            model: aiResult.modelName,
        } : {
            enabled: false,
            message: 'AI analysis not available',
        },
        metadata: {
            analysis_version: '2.0',
            timestamp: new Date().toISOString(),
            detection_layers: aiResult ? ['ai', 'heuristic'] : ['heuristic'],
        },
    };
};

/**
 * Validate score is within bounds
 */
export const validateScore = (score) => {
    if (typeof score !== 'number' || isNaN(score)) {
        return 0;
    }
    return Math.max(0, Math.min(100, score));
};
