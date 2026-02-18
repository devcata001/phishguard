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

describe('Risk Scoring Utility', () => {
    describe('calculateRiskLevel', () => {
        test('should return SAFE for scores below 40', () => {
            expect(calculateRiskLevel(0)).toBe(RiskLevel.SAFE);
            expect(calculateRiskLevel(20)).toBe(RiskLevel.SAFE);
            expect(calculateRiskLevel(39)).toBe(RiskLevel.SAFE);
        });

        test('should return SUSPICIOUS for scores 40-69', () => {
            expect(calculateRiskLevel(40)).toBe(RiskLevel.SUSPICIOUS);
            expect(calculateRiskLevel(55)).toBe(RiskLevel.SUSPICIOUS);
            expect(calculateRiskLevel(69)).toBe(RiskLevel.SUSPICIOUS);
        });

        test('should return HIGH_RISK for scores 70+', () => {
            expect(calculateRiskLevel(70)).toBe(RiskLevel.HIGH_RISK);
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
