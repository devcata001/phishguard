/**
 * Tests for Heuristic Detection Service
 */

import { analyzeHeuristic } from '../services/heuristicService.js';
import { analyzeHeuristics } from '../services/keywordService.js';
import { analyzeUrls } from '../services/urlService.js';

describe('Heuristic Detection Service', () => {
    describe('analyzeHeuristic', () => {
        test('should detect safe email with low score', () => {
            const text = 'Hello team,\n\nThe meeting is scheduled for tomorrow at 10am.\n\nThanks';
            const result = analyzeHeuristic(text);

            expect(result.score).toBeLessThan(40);
            expect(result.reasons).toBeInstanceOf(Array);
        });

        test('should detect phishing email with high score', () => {
            const text = `URGENT!!! Your account will be suspended immediately!
        Click here to verify: http://192.168.1.1/login
        Please confirm your password and social security number.`;

            const result = analyzeHeuristic(text);

            expect(result.score).toBeGreaterThanOrEqual(40);
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        test('should detect urgency tactics', () => {
            const text = 'URGENT! Act now! Limited time offer expires immediately!';
            const result = analyzeHeuristics(text);

            expect(result.score).toBeGreaterThan(0);
            expect(result.reasons.some(r => r.toLowerCase().includes('urgency'))).toBe(true);
        });

        test('should detect credential requests', () => {
            const text = 'Please verify your account and confirm your password immediately.';
            const result = analyzeHeuristics(text);

            expect(result.score).toBeGreaterThan(0);
        });

        test('should strongly detect wallet seed phrase scam language', () => {
            const text = 'Urgent wallet recovery required. Share your seed phrase and private key now to restore access.';
            const result = analyzeHeuristics(text);

            expect(result.score).toBeGreaterThanOrEqual(70);
            expect(result.reasons.some(r => r.toLowerCase().includes('walletrecoveryscam'))).toBe(true);
        });

        test('should detect old wallet seed phrase wording', () => {
            const text = 'I need an old wallet seed phrase to help recover funds. Please send it now.';
            const result = analyzeHeuristics(text);

            expect(result.score).toBeGreaterThanOrEqual(70);
            expect(result.reasons.some(r => r.toLowerCase().includes('wallet'))).toBe(true);
        });

        test('should detect excessive exclamation marks', () => {
            const text = 'Amazing offer!!!! Click now!!!!! Limited time!!!!!';
            const result = analyzeHeuristics(text);

            expect(result.reasons.some(r => r.toLowerCase().includes('exclamation'))).toBe(true);
        });
    });

    describe('analyzeUrls', () => {
        test('should detect IP-based URLs', () => {
            const text = 'Click here: http://192.168.1.1/login';
            const result = analyzeUrls(text);

            expect(result.score).toBeGreaterThan(0);
            expect(result.reasons.some(r => r.toLowerCase().includes('ip'))).toBe(true);
        });

        test('should handle text with no URLs', () => {
            const text = 'This is a simple message with no links.';
            const result = analyzeUrls(text);

            expect(result.score).toBe(0);
            expect(result.urlCount).toBe(0);
        });

        test('should detect embedded credentials in URL', () => {
            const text = 'Visit http://user:pass@example.com/login';
            const result = analyzeUrls(text);

            expect(result.score).toBeGreaterThan(0);
            expect(result.reasons.some(r => r.toLowerCase().includes('credentials'))).toBe(true);
        });

        test('should detect multiple URLs', () => {
            const text = `
        Link 1: http://site1.com
        Link 2: http://site2.com
        Link 3: http://site3.com
        Link 4: http://site4.com
        Link 5: http://site5.com
        Link 6: http://site6.com
      `;
            const result = analyzeUrls(text);

            expect(result.urlCount).toBeGreaterThanOrEqual(5);
            expect(result.reasons.some(r => r.includes('Excessive URLs'))).toBe(true);
        });
    });
});
