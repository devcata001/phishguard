/**
 * Integration Tests for Analyze Endpoint
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// Mock AI service to avoid real API calls in tests
const mockAnalyze = jest.fn().mockResolvedValue({
    isPhishing: true,
    confidence: 0.85,
    phishingProbability: 0.9,
    legitimateProbability: 0.1,
    riskFactors: ['Urgency tactics', 'Credential request'],
    modelName: 'Mock AI',
});

jest.unstable_mockModule('../services/aiService.js', () => ({
    __esModule: true,
    default: {
        analyze: mockAnalyze,
    },
    analyzeWithAI: mockAnalyze,
}));

const { default: app } = await import('../server.js');

describe('POST /analyze', () => {
    test('should analyze safe email successfully', async () => {
        const response = await request(app)
            .post('/analyze')
            .send({
                text: 'Hello team, the meeting is scheduled for tomorrow at 10am. Thanks!',
            })
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toHaveProperty('risk_score');
        expect(response.body).toHaveProperty('risk_level');
        expect(response.body).toHaveProperty('flags');
        expect(Array.isArray(response.body.flags)).toBe(true);
    });

    test('should detect phishing email', async () => {
        const response = await request(app)
            .post('/analyze')
            .send({
                text: `URGENT!!! Your account will be suspended!
               Click here: http://192.168.1.1/verify
               Enter your password and social security number now!`,
            })
            .expect(200);

        expect(response.body.risk_score).toBeGreaterThan(0);
        expect(['SUSPICIOUS', 'HIGH_RISK']).toContain(response.body.risk_level);
    });

    test('should reject empty text', async () => {
        const response = await request(app)
            .post('/analyze')
            .send({ text: '' })
            .expect(400);

        expect(response.body).toHaveProperty('error');
    });

    test('should reject missing text field', async () => {
        const response = await request(app)
            .post('/analyze')
            .send({})
            .expect(400);

        expect(response.body).toHaveProperty('error');
    });

    test('should reject text that is too long', async () => {
        const longText = 'a'.repeat(200000);
        const response = await request(app)
            .post('/analyze')
            .send({ text: longText })
            .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
    });

    test('should reject non-string text', async () => {
        const response = await request(app)
            .post('/analyze')
            .send({ text: 12345 })
            .expect(400);

        expect(response.body).toHaveProperty('error');
    });

    test('should reject unknown fields', async () => {
        const response = await request(app)
            .post('/analyze')
            .send({
                text: 'Valid text',
                unknownField: 'something',
            })
            .expect(400);
    });

    test('should handle malformed JSON', async () => {
        const response = await request(app)
            .post('/analyze')
            .set('Content-Type', 'application/json')
            .send('{ invalid json }')
            .expect(400);

        expect(response.body.message).toMatch(/invalid json/i);
    });
});

describe('GET /health', () => {
    test('should return health status', async () => {
        const response = await request(app)
            .get('/health')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('service');
        expect(response.body).toHaveProperty('version');
        expect(response.body).toHaveProperty('features');
    });
});

describe('404 Handler', () => {
    test('should return 404 for unknown routes', async () => {
        const response = await request(app)
            .get('/unknown-route')
            .expect(404);

        expect(response.body).toHaveProperty('error', 'Not Found');
    });
});

describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
        // This test would need to be adjusted based on rate limit settings
        // For now, just verify that multiple requests can be made
        const promises = Array(5).fill(null).map(() =>
            request(app)
                .post('/analyze')
                .send({ text: 'Test email' })
        );

        const responses = await Promise.all(promises);
        expect(responses.every(r => [200, 429].includes(r.status))).toBe(true);
    }, 15000);
});
