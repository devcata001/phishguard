/**
 * URL Detection Service
 * 
 * Analyzes URLs in message content (emails, SMS, chat, social media) for phishing indicators.
 * Detects IP addresses, suspicious domains, shortened URLs, and mismatches.
 */

import logger from '../utils/logger.js';

/**
 * Known phishing and suspicious domains
 */
const SUSPICIOUS_DOMAINS = [
    // Common phishing domains
    'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co',
    // Typosquatting examples (add more as needed)
    'paypa1.com', 'gooogle.com', 'microsft.com',
    // Generic suspicious TLDs
    '.tk', '.ml', '.ga', '.cf', '.gq',
];

/**
 * Regex patterns for URL detection
 */
const URL_PATTERNS = {
    // HTTP/HTTPS URLs
    standard: /https?:\/\/[^\s<>"']+/gi,
    // IP addresses in URLs
    ipAddress: /https?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?/gi,
    // URLs with @ symbol (credential phishing)
    withCredentials: /https?:\/\/[^@]+@[^\s<>"']+/gi,
    // Suspicious port numbers
    suspiciousPorts: /https?:\/\/[^:\/]+:(?:8080|8888|3000|4444|5555)/gi,
};

/**
 * Extract all URLs from text
 */
const extractUrls = (text) => {
    const urls = [];
    const matches = text.matchAll(URL_PATTERNS.standard);

    for (const match of matches) {
        urls.push(match[0]);
    }

    return [...new Set(urls)]; // Remove duplicates
};

/**
 * Check if URL uses IP address instead of domain
 */
const hasIpAddress = (url) => {
    return /https?:\/\/(?:\d{1,3}\.){3}\d{1,3}/.test(url);
};

/**
 * Check if URL contains suspicious domain
 */
const hasSuspiciousDomain = (url) => {
    const urlLower = url.toLowerCase();
    return SUSPICIOUS_DOMAINS.some(domain => urlLower.includes(domain));
};

/**
 * Check if URL has embedded credentials
 */
const hasEmbeddedCredentials = (url) => {
    return /@/.test(url.split('/')[2] || '');
};

/**
 * Check if URL uses suspicious port
 */
const hasSuspiciousPort = (url) => {
    return /:\d{4}/.test(url);
};

/**
 * Check for URL obfuscation techniques
 */
const isObfuscated = (url) => {
    // Excessive subdomains
    const hostname = url.split('/')[2] || '';
    const subdomains = hostname.split('.');

    if (subdomains.length > 4) {
        return true;
    }

    // Very long URLs (potential hiding technique)
    if (url.length > 200) {
        return true;
    }

    // Mixed case in domain (possible obfuscation)
    const domain = hostname.toLowerCase();
    if (hostname !== domain && hostname !== domain.toUpperCase()) {
        return true;
    }

    return false;
};

/**
 * Check for homograph attacks (look-alike characters)
 */
const hasHomographAttack = (url) => {
    // Common homograph characters
    const homographs = /[а-яіїєА-ЯІЇЄ]/; // Cyrillic characters that look like Latin
    return homographs.test(url);
};

/**
 * Analyze URLs in text
 */
export const analyzeUrls = (text) => {
    let score = 0;
    const reasons = [];

    try {
        const urls = extractUrls(text);

        if (urls.length === 0) {
            return { score: 0, reasons: [], urlCount: 0 };
        }

        // Excessive URLs
        if (urls.length > 5) {
            score += 10;
            reasons.push(`Excessive URLs detected (${urls.length})`);
        }

        // Analyze each URL
        for (const url of urls) {
            // IP address URLs
            if (hasIpAddress(url)) {
                score += 20;
                reasons.push(`Suspicious IP-based URL: ${url.substring(0, 50)}`);
            }

            // Embedded credentials
            if (hasEmbeddedCredentials(url)) {
                score += 25;
                reasons.push('URL contains embedded credentials');
            }

            // Known suspicious domains
            if (hasSuspiciousDomain(url)) {
                score += 15;
                reasons.push(`Known suspicious domain in URL`);
            }

            // Suspicious ports
            if (hasSuspiciousPort(url)) {
                score += 10;
                reasons.push(`URL uses suspicious port number`);
            }

            // Obfuscation
            if (isObfuscated(url)) {
                score += 12;
                reasons.push('URL appears obfuscated');
            }

            // Homograph attack
            if (hasHomographAttack(url)) {
                score += 18;
                reasons.push('Potential homograph attack in URL');
            }

            // HTTP instead of HTTPS
            if (url.startsWith('http://')) {
                score += 5;
                reasons.push('Insecure HTTP URL detected');
            }
        }

        logger.debug(`URL analysis: ${urls.length} URLs found, score=${score}`);

        return {
            score: Math.min(score, 100), // Cap at 100
            reasons: [...new Set(reasons)], // Remove duplicates
            urlCount: urls.length,
        };

    } catch (error) {
        logger.error(`URL analysis error: ${error.message}`);
        return {
            score: 0,
            reasons: ['URL analysis failed'],
            urlCount: 0,
        };
    }
};

/**
 * Check for link-text mismatches (displayed text vs actual URL)
 */
export const checkLinkMismatches = (text) => {
    const reasons = [];
    let score = 0;

    // Pattern: [display text](actual url) or <a href="url">text</a>
    const markdownLinks = text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    const htmlLinks = text.matchAll(/<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi);

    const checkMismatch = (displayText, actualUrl) => {
        displayText = displayText.toLowerCase().trim();
        actualUrl = actualUrl.toLowerCase().trim();

        // If display text looks like a URL but doesn't match actual URL
        if (displayText.startsWith('http') && displayText !== actualUrl) {
            score += 20;
            reasons.push('Link text does not match actual destination URL');
            return true;
        }

        // If display text contains a domain name that doesn't match URL domain
        const displayDomain = displayText.match(/(?:https?:\/\/)?([^\/\s:]+)/);
        const actualDomain = actualUrl.match(/(?:https?:\/\/)?([^\/\s:]+)/);

        if (displayDomain && actualDomain && displayDomain[1] !== actualDomain[1]) {
            score += 15;
            reasons.push('Misleading link text detected');
            return true;
        }

        return false;
    };

    // Check markdown links
    for (const match of markdownLinks) {
        checkMismatch(match[1], match[2]);
    }

    // Check HTML links
    for (const match of htmlLinks) {
        checkMismatch(match[2], match[1]);
    }

    return { score, reasons };
};
