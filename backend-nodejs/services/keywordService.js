/**
 * Keyword Scanner Service
 * 
 * Detects phishing indicators through keyword and pattern analysis.
 * Includes urgency tactics, credential requests, and behavioral manipulation.
 */

import logger from '../utils/logger.js';

/**
 * Phishing keyword categories with scores
 */
const KEYWORD_CATEGORIES = {
    urgency: {
        score: 12,
        keywords: [
            'urgent', 'immediate', 'act now', 'limited time',
            'expires', 'hurry', 'quick', 'immediately',
            'expires today', 'act fast', 'last chance',
            'expire soon', 'time sensitive', 'deadline'
        ],
    },
    credentials: {
        score: 20,
        keywords: [
            'verify account', 'confirm identity', 'update password',
            'verify your account', 'confirm your identity',
            'validate account', 'suspend', 'suspended',
            'locked account', 'unusual activity', 'security alert',
            'verify now', 'confirm now', 'click here to verify'
        ],
    },
    payment: {
        score: 18,
        keywords: [
            'payment failed', 'billing problem', 'update payment',
            'credit card', 'payment method', 'refund',
            'prize', 'winner', 'claim', 'reward',
            'invoice', 'overdue', 'payment required'
        ],
    },
    threats: {
        score: 15,
        keywords: [
            'account will be closed', 'will be suspended',
            'take action', 'legal action', 'consequences',
            'terminate', 'deactivate', 'disabled'
        ],
    },
    impersonation: {
        score: 10,
        keywords: [
            'dear customer', 'dear user', 'dear member',
            'valued customer', 'account holder'
        ],
    },
    cryptoScam: {
        score: 25,
        keywords: [
            'double your bitcoin', 'triple your crypto', 'guaranteed returns',
            'investment opportunity', 'passive income', 'financial freedom',
            'get rich quick', 'earn money fast', 'limited slots',
            'exclusive investment', 'crypto giveaway', 'free bitcoin',
            'elon musk giveaway', 'nft airdrop', 'token presale',
            'yield farming', '100x returns', 'moonshot', 'pump',
            'mining pool', 'cloud mining', 'invest now', 'roi guaranteed'
        ],
    },
    ponziScheme: {
        score: 30,
        keywords: [
            'mlm', 'multi-level marketing', 'network marketing',
            'pyramid scheme', 'referral bonus', 'recruit members',
            'downline', 'upline', 'matrix system', 'cycler',
            'gifting circle', 'cash gifting', 'make money from home',
            'be your own boss', 'no experience needed', 'easy money',
            'join now and earn', 'unlimited income potential',
            'residual income', 'leverage', 'compound interest daily'
        ],
    },
    walletRecoveryScam: {
        score: 40,
        keywords: [
            'seed phrase', 'recovery phrase', 'secret recovery phrase',
            'wallet recovery', 'recover your wallet', 'wallet restore',
            'private key', 'mnemonic phrase', '12 word phrase',
            '24 word phrase', 'wallet verification phrase',
            'import your wallet', 'synchronize your wallet',
            'old wallet', 'old wallet seed', 'old wallet phrase',
            'wallet scope'
        ],
    },
    marketManipulationScam: {
        score: 35,
        keywords: [
            'rug pull', 'rug coins', 'pump and dump', 'wash trading',
            'fake volume', 'exit liquidity', 'market manipulation',
            'shill token', 'shilling', 'spraying', 'spray buys',
            'ape in', 'aped', '10x profit', 'x10 profit',
            'double your sol', 'more sol', 'buyers can see',
            'transaction history boost', 'fake transactions', 'fake wallet history'
        ],
    },
};

const CONTEXT_SCAM_PATTERNS = [
    /(need|send|share|provide|give).{0,40}(old\s+wallet).{0,40}(seed\s*phrase|recovery\s*phrase|mnemonic|private\s*key|wallet\s*phrase)/i,
    /(old\s+wallet).{0,40}(seed\s*phrase|recovery\s*phrase|mnemonic|private\s*key|wallet\s*phrase)/i,
    /(old\s+account\s+phrase|account\s+phrase).{0,60}(transaction\s*history|transactions?)/i,
    /(rug\s*pull|rug\s*coins?).{0,80}(buyers?|buy|profit|10x|x10|sol)/i,
    /(spray(ing)?|shill(ing)?|ape(d)?).{0,80}(token|coin|buyers?|buy)/i,
];

/**
 * Known phishing phrases (higher weight)
 */
const HIGH_RISK_PHRASES = [
    'verify your account immediately',
    'click here to login',
    'confirm your password',
    'unusual sign-in activity',
    'your account has been compromised',
    'suspended due to',
    'click here to verify',
    're-enter your password',
    'send money now',
    'wire transfer',
    'send bitcoin to',
    'wallet address',
    'investment returns guaranteed',
    'risk-free investment',
    'limited time offer expires',
    'act now before',
    'congratulations you won',
    'claim your prize now',
    'verify to unlock',
    'double your investment',
    'share your seed phrase',
    'send your seed phrase',
    'provide your recovery phrase',
    'enter your recovery phrase',
    'confirm your wallet phrase',
    'share your private key',
    'wallet recovery required',
    'restore wallet now',
];

/**
 * Scan text for phishing keywords
 */
export const scanKeywords = (text) => {
    const textLower = text.toLowerCase();
    let score = 0;
    const reasons = [];

    // Check keyword categories
    for (const [category, data] of Object.entries(KEYWORD_CATEGORIES)) {
        const matches = data.keywords.filter(keyword => textLower.includes(keyword));

        if (matches.length > 0) {
            score += data.score;
            reasons.push(
                `${category.charAt(0).toUpperCase() + category.slice(1)} indicators detected: ${matches.slice(0, 3).join(', ')}`
            );
        }
    }

    // Check high-risk phrases
    const phraseMatches = HIGH_RISK_PHRASES.filter(phrase => textLower.includes(phrase));
    if (phraseMatches.length > 0) {
        score += phraseMatches.length * 15;
        reasons.push(`Critical phishing phrases found: ${phraseMatches.slice(0, 2).join(', ')}`);
    }

    // Contextual wallet-drain scam patterns
    const contextMatches = CONTEXT_SCAM_PATTERNS.filter((pattern) => pattern.test(text));
    if (contextMatches.length > 0) {
        score += 30;
        reasons.push('Contextual wallet recovery scam language detected');
    }

    return { score, reasons };
};

/**
 * Analyze behavioral manipulation tactics
 */
export const analyzeBehavior = (text) => {
    let score = 0;
    const reasons = [];
    const textLower = text.toLowerCase();

    // Excessive exclamation marks
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount >= 5) {
        score += 8;
        reasons.push(`Excessive exclamation marks (${exclamationCount})`);
    } else if (exclamationCount >= 3) {
        score += 4;
        reasons.push('Multiple exclamation marks detected');
    }

    // All caps words (shouting)
    const words = text.split(/\s+/);
    const capsWords = words.filter(word =>
        word.length > 3 &&
        word === word.toUpperCase() &&
        /^[A-Z]+$/.test(word)
    );

    if (capsWords.length >= 5) {
        score += 7;
        reasons.push(`Multiple all-caps words (${capsWords.length})`);
    } else if (capsWords.length >= 3) {
        score += 3;
        reasons.push('All-caps words detected');
    }

    // Multiple question marks
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount >= 3) {
        score += 3;
        reasons.push('Excessive questioning detected');
    }

    // Check for personal information requests
    const sensitiveRequests = [
        'social security', 'ssn', 'date of birth', 'dob',
        'mother\'s maiden name', 'passport number', 'driver\'s license',
        'account number', 'routing number', 'pin number', 'cvv',
        'seed phrase', 'recovery phrase', 'private key', 'wallet phrase'
    ];

    const sensitiveMatches = sensitiveRequests.filter(term => textLower.includes(term));
    if (sensitiveMatches.length > 0) {
        score += 15;
        reasons.push(`Requests sensitive information: ${sensitiveMatches.slice(0, 2).join(', ')}`);
    }

    // Grammar indicators (crude but effective)
    const grammarIssues = [];

    // Multiple spaces
    if (/\s{3,}/.test(text)) {
        grammarIssues.push('irregular spacing');
    }

    // Unusual punctuation
    if (/[.!?]{3,}/.test(text)) {
        grammarIssues.push('excessive punctuation');
    }

    if (grammarIssues.length > 0) {
        score += 5;
        reasons.push(`Potential grammar issues: ${grammarIssues.join(', ')}`);
    }

    return { score, reasons };
};

/**
 * Combined keyword and behavioral analysis
 */
export const analyzeHeuristics = (text) => {
    try {
        const keywordResult = scanKeywords(text);
        const behaviorResult = analyzeBehavior(text);

        const totalScore = keywordResult.score + behaviorResult.score;
        const allReasons = [...keywordResult.reasons, ...behaviorResult.reasons];

        logger.debug(`Heuristic analysis: score=${totalScore}, factors=${allReasons.length}`);

        return {
            score: totalScore,
            reasons: allReasons,
        };
    } catch (error) {
        logger.error(`Heuristic analysis error: ${error.message}`);
        return {
            score: 0,
            reasons: ['Heuristic analysis failed'],
        };
    }
};
