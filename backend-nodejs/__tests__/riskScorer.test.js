/**
 * Tests for Risk Scoring Utility
 */

import {
    calculateRiskLevel,
    combineScores,
    mergeRiskFactors,
    validateScore,
    RiskLevel,
} from '../utils/riskScorer.js';
import config from '../config.js';

describe('Risk Scoring Utility', () => {
    describe('calculateRiskLevel', () => {
        test('should return SAFE for scores below suspicious threshold', () => {
            expect(calculateRiskLevel(0)).toBe(RiskLevel.SAFE);
            expect(calculateRiskLevel(config.risk.suspiciousThreshold - 1)).toBe(RiskLevel.SAFE);
        });

        test('should return SUSPICIOUS for scores between suspicious and high thresholds', () => {
            expect(calculateRiskLevel(config.risk.suspiciousThreshold)).toBe(RiskLevel.SUSPICIOUS);
            expect(calculateRiskLevel(config.risk.highThreshold - 1)).toBe(RiskLevel.SUSPICIOUS);
        });

        test('should return HIGH_RISK for scores at or above high threshold', () => {
            expect(calculateRiskLevel(config.risk.highThreshold)).toBe(RiskLevel.HIGH_RISK);
            expect(calculateRiskLevel(85)).toBe(RiskLevel.HIGH_RISK);
            expect(calculateRiskLevel(100)).toBe(RiskLevel.HIGH_RISK);
        });
    });

    describe('combineScores', () => {
        test('should return heuristic score when AI is not available', () => {
            const score = combineScores(null, 50);
            expect(score).toBe(50);
        });

        test('should combine AI and heuristic scores', () => {
            const aiResult = {
                phishingProbability: 0.8,
                confidence: 0.9,
            };

            const score = combineScores(aiResult, 60);
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should not exceed 100', () => {
            const aiResult = {
                phishingProbability: 1.0,
                confidence: 1.0,
            };

            const score = combineScores(aiResult, 100);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should preserve high heuristic risk when AI probability is low', () => {
            const aiResult = {
                phishingProbability: 0.05,
                confidence: 0.95,
            };

            const score = combineScores(aiResult, 82);
            expect(score).toBeGreaterThanOrEqual(82);
        });

        test('should preserve suspicious heuristic score when AI is confidently wrong', () => {
            const aiResult = {
                phishingProbability: 0.02,
                confidence: 0.98,
            };

            const score = combineScores(aiResult, 45);
            expect(score).toBeGreaterThanOrEqual(45);
        });

        test('should boost score when AI marks message as phishing with high confidence', () => {
            const aiResult = {
                isPhishing: true,
                phishingProbability: 0.35,
                confidence: 0.92,
                riskFactors: ['factor1'],
            };

            const score = combineScores(aiResult, 10);
            expect(score).toBeGreaterThanOrEqual(55);
        });

        test('should boost score when AI provides multiple phishing risk factors', () => {
            const aiResult = {
                isPhishing: true,
                phishingProbability: 0.4,
                confidence: 0.75,
                riskFactors: ['urgency', 'credential theft', 'impersonation'],
            };

            const score = combineScores(aiResult, 5);
            expect(score).toBeGreaterThanOrEqual(57);
        });
    });

    describe('mergeRiskFactors', () => {
        test('should merge heuristic reasons', () => {
            const heuristicReasons = ['Urgency detected', 'IP URL found'];
            const factors = mergeRiskFactors(null, heuristicReasons);

            expect(factors).toContain('Urgency detected');
            expect(factors).toContain('IP URL found');
        });

        test('should include AI factors when available', () => {
            const aiResult = {
                confidence: 0.95,
                riskFactors: ['Impersonation attempt', 'Credential theft'],
                modelName: 'Test AI',
            };

            const factors = mergeRiskFactors(aiResult, ['URL detected']);

            expect(factors.length).toBeGreaterThan(0);
            expect(factors.some(f => f.includes('AI Analysis'))).toBe(true);
        });

        test('should remove duplicates', () => {
            const reasons = ['Urgency', 'Urgency', 'IP URL'];
            const factors = mergeRiskFactors(null, reasons);

            expect(factors.filter(f => f === 'Urgency').length).toBe(1);
        });
    });

    describe('validateScore', () => {
        test('should clamp scores to 0-100 range', () => {
            expect(validateScore(-10)).toBe(0);
            expect(validateScore(150)).toBe(100);
            expect(validateScore(50)).toBe(50);
        });

        test('should handle invalid inputs', () => {
            expect(validateScore(NaN)).toBe(0);
            expect(validateScore(undefined)).toBe(0);
            expect(validateScore(null)).toBe(0);
        });
    });
});
