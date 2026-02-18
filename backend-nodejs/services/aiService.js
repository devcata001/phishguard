/**
 * Google Gemini AI Service
 * 
 * Integrates Google Gemini API for deep phishing detection in messages.
 * Analyzes emails, SMS, chat messages, and social media content.
 * Provides confidence scoring and risk factor identification.
 */

import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * AI Analysis Result structure
 */
export class AIAnalysisResult {
    constructor(data) {
        this.isPhishing = data.isPhishing;
        this.confidence = data.confidence;
        this.phishingProbability = data.phishingProbability;
        this.legitimateProbability = data.legitimateProbability;
        this.riskFactors = data.riskFactors || [];
        this.modelName = 'PhishGuard AI v2.0 (Google Gemini 2.5 Flash)';
    }

    toJSON() {
        return {
            is_phishing: this.isPhishing,
            confidence: Math.round(this.confidence * 1000) / 1000,
            phishing_probability: Math.round(this.phishingProbability * 1000) / 1000,
            legitimate_probability: Math.round(this.legitimateProbability * 1000) / 1000,
            risk_factors: this.riskFactors,
            model_name: this.modelName,
        };
    }
}

/**
 * Gemini AI Client
 */
class GeminiAI {
    constructor() {
        this.apiKey = config.ai.geminiApiKey;
        this.enabled = config.ai.enabled;
        this.modelName = 'PhishGuard AI v2.0 (Google Gemini)';

        if (!this.enabled) {
            logger.warn('Gemini AI not configured - AI analysis disabled');
        } else {
            logger.info('Gemini AI initialized successfully');
        }
    }

    /**
     * Analyze message content for phishing indicators
     * Supports emails, SMS, chat messages, and social media content
     */
    async analyze(text) {
        if (!this.enabled) {
            throw new Error('AI service not available - API key not configured');
        }

        const prompt = this._buildPrompt(text);

        try {
            const response = await axios.post(
                `${GEMINI_API_URL}?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                    safetySettings: [
                        {
                            category: 'HARM_CATEGORY_HARASSMENT',
                            threshold: 'BLOCK_NONE'
                        },
                        {
                            category: 'HARM_CATEGORY_HATE_SPEECH',
                            threshold: 'BLOCK_NONE'
                        },
                        {
                            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                            threshold: 'BLOCK_NONE'
                        },
                        {
                            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                            threshold: 'BLOCK_NONE'
                        }
                    ]
                },
                {
                    timeout: config.ai.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            return this._parseResponse(response.data);

        } catch (error) {
            if (error.response) {
                logger.error(`Gemini API error: ${error.response.status} - ${error.response.statusText}`);
                logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                logger.error(`Gemini API request timeout or network error. Error code: ${error.code}`);
                logger.error(`Error message: ${error.message}`);
            } else {
                logger.error(`Gemini AI error: ${error.message}`);
            }
            throw new Error('AI analysis failed');
        }
    }

    /**
     * Build analysis prompt for Gemini
     */
    _buildPrompt(messageText) {
        return `You are an expert cybersecurity AI specializing in phishing and scam detection. Analyze the following message content (email, SMS, chat, or social media message) and determine if it's a phishing or scam attempt.

**Message Content:**
"""
${messageText}
"""

**Analysis Requirements:**
1. Determine if this is a phishing/scam message (true/false)
2. Provide confidence score (0.0 to 1.0)
3. Calculate phishing probability (0.0 to 1.0)
4. Calculate legitimate probability (0.0 to 1.0)
5. List specific risk factors found

**Consider these indicators:**
- Urgency and fear tactics
- Suspicious links or URLs (including shortened links)
- Requests for sensitive information (passwords, credit cards, SSN, OTP codes)
- Impersonation of legitimate organizations or people
- Grammar and spelling errors
- Spoofed sender addresses or phone numbers
- Unexpected attachments or download requests
- Too-good-to-be-true offers or prizes
- Threats or consequences
- Requests to move conversation to different platform

**Response Format (JSON only):**
{
  "isPhishing": boolean,
  "confidence": number (0.0-1.0),
  "phishingProbability": number (0.0-1.0),
  "legitimateProbability": number (0.0-1.0),
  "riskFactors": ["factor1", "factor2", ...]
}

**Important:** Respond ONLY with valid JSON. No additional text or explanation.`;
    }

    /**
     * Parse Gemini API response
     */
    _parseResponse(data) {
        try {
            // Extract text from Gemini response
            const candidate = data.candidates?.[0];
            if (!candidate || !candidate.content?.parts?.[0]?.text) {
                throw new Error('Invalid response structure from Gemini');
            }

            let responseText = candidate.content.parts[0].text.trim();

            // Remove markdown code blocks if present
            responseText = responseText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

            // Try to extract JSON object if there's extra text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }

            // Fix common JSON issues with multiline strings
            // This regex finds string values and replaces raw newlines with \n
            responseText = responseText.replace(/"([^"]*)"(\s*[,\}\]])/g, (match, content, suffix) => {
                // Escape newlines and other special characters in string content
                const cleaned = content
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t');
                return `"${cleaned}"${suffix}`;
            });

            // Parse JSON response
            const analysis = JSON.parse(responseText);

            // Validate response structure
            if (typeof analysis.isPhishing !== 'boolean' ||
                typeof analysis.confidence !== 'number' ||
                typeof analysis.phishingProbability !== 'number' ||
                typeof analysis.legitimateProbability !== 'number' ||
                !Array.isArray(analysis.riskFactors)) {
                throw new Error('Invalid analysis structure from AI');
            }

            return new AIAnalysisResult(analysis);

        } catch (error) {
            logger.error(`Failed to parse AI response: ${error.message}`);
            logger.debug(`Raw response (first 300 chars): ${data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 300)}`);
            throw new Error('Failed to parse AI analysis');
        }
    }
}

// Export singleton instance
const geminiAI = new GeminiAI();
export default geminiAI;

/**
 * Convenience function for analyzing messages
 */
export const analyzeWithAI = async (text) => {
    return await geminiAI.analyze(text);
};
