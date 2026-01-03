"""
Phishing Detection Engine

Multi-layer analysis engine combining multiple detection techniques:
- Keyword and pattern analysis
- URL and domain validation
- Behavioral indicators
- Anomaly detection

All scoring is transparent and explainable for security auditing.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

from .keyword_scanner import scan_keywords
from .url_detector import analyze_urls

logger = logging.getLogger(__name__)

# Risk thresholds (tunable based on false positive analysis)
RISK_HIGH_THRESHOLD = 60
RISK_SUSPICIOUS_THRESHOLD = 25
RISK_SAFE_THRESHOLD = 0


@dataclass(frozen=True)
class AnalysisResult:
    """Immutable analysis result."""
    score: int
    risk_level: str
    reasons: list[str]
    
    def __post_init__(self):
        """Validate result integrity."""
        if self.score < 0:
            raise ValueError("Score cannot be negative")
        if self.risk_level not in {"SAFE", "SUSPICIOUS", "HIGH_RISK"}:
            raise ValueError(f"Invalid risk level: {self.risk_level}")
        if not isinstance(self.reasons, list):
            raise ValueError("Reasons must be a list")


def _calculate_risk_level(score: int) -> str:
    """
    Map numerical score to categorical risk level.
    
    Thresholds are conservative to minimize false positives
    while maintaining high detection rate.
    """
    if score >= RISK_HIGH_THRESHOLD:
        return "HIGH_RISK"
    if score >= RISK_SUSPICIOUS_THRESHOLD:
        return "SUSPICIOUS"
    return "SAFE"


def _analyze_behavioral_indicators(text: str) -> tuple[int, list[str]]:
    """
    Detect behavioral manipulation tactics common in phishing.
    
    Returns: (score, reasons)
    """
    score = 0
    reasons = []
    
    text_lower = text.lower()
    
    # Excessive urgency indicators
    urgency_count = sum(1 for phrase in [
        'urgent', 'immediate', 'act now', 'limited time',
        'expires', 'hurry', 'quick', 'immediately'
    ] if phrase in text_lower)
    
    if urgency_count >= 3:
        score += 12
        reasons.append("Multiple urgency tactics detected - common in phishing attacks")
    elif urgency_count >= 2:
        score += 6
        reasons.append("Urgency language detected - verify sender authenticity")
    
    # Excessive exclamation marks (emotional manipulation)
    exclamation_count = text.count('!')
    if exclamation_count >= 5:
        score += 8
        reasons.append(f"Excessive exclamation marks ({exclamation_count}) - may indicate pressure tactics")
    
    # All caps words (aggressive communication)
    words = text.split()
    caps_words = [w for w in words if len(w) > 3 and w.isupper() and w.isalpha()]
    if len(caps_words) >= 5:
        score += 7
        reasons.append("Multiple all-caps words - aggressive communication pattern")
    
    # Personal information requests
    sensitive_requests = [
        r'\b(password|ssn|social security|credit card|cvv|pin)\b',
        r'\b(bank account|routing number|account number)\b',
        r'\b(verify.*account|confirm.*identity|update.*information)\b'
    ]
    
    for pattern in sensitive_requests:
        if re.search(pattern, text_lower):
            score += 15
            reasons.append("Requests sensitive personal information - major phishing indicator")
            break
    
    # Currency symbols with urgency (financial scams)
    if re.search(r'[\$£€¥]\s*\d+', text) and urgency_count > 0:
        score += 8
        reasons.append("Financial amounts combined with urgency - potential scam")
    
    return score, reasons


def _analyze_anomalies(text: str) -> tuple[int, list[str]]:
    """
    Detect text anomalies and suspicious patterns.
    
    Returns: (score, reasons)
    """
    score = 0
    reasons = []
    
    # Excessive spacing (obfuscation technique)
    if re.search(r'\s{5,}', text):
        score += 5
        reasons.append("Unusual spacing detected - possible obfuscation attempt")
    
    # Mixed scripts (lookalike characters)
    # Check for common homograph attacks
    suspicious_chars = ['а', 'е', 'о', 'р', 'с', 'у', 'х']  # Cyrillic lookalikes
    if any(char in text for char in suspicious_chars):
        score += 10
        reasons.append("Suspicious characters detected - possible lookalike/homograph attack")
    
    # Hidden text (zero-width characters)
    zero_width_chars = ['\u200b', '\u200c', '\u200d', '\ufeff']
    if any(char in text for char in zero_width_chars):
        score += 12
        reasons.append("Hidden zero-width characters detected - steganography attempt")
    
    # Excessive special characters
    special_char_ratio = sum(1 for c in text if not c.isalnum() and not c.isspace()) / max(len(text), 1)
    if special_char_ratio > 0.15:
        score += 6
        reasons.append("High ratio of special characters - unusual pattern")
    
    return score, reasons


def analyze_email(text: str) -> AnalysisResult:
    """
    Perform comprehensive phishing analysis on email content.
    
    Multi-layer approach:
    1. Keyword/phrase analysis
    2. URL and link validation
    3. Behavioral indicator detection
    4. Anomaly detection
    
    Args:
        text: Raw email content (subject + body)
    
    Returns:
        AnalysisResult with risk score, level, and detailed reasons
    
    Raises:
        ValueError: If input is invalid
    """
    if not isinstance(text, str):
        raise ValueError("Input must be a string")
    
    if not text.strip():
        raise ValueError("Input cannot be empty")
    
    total_score = 0
    all_reasons: list[str] = []
    
    try:
        # Layer 1: Keyword analysis
        kw_score, kw_reasons = scan_keywords(text)
        total_score += kw_score
        all_reasons.extend(kw_reasons)
        logger.debug(f"Keyword analysis: score={kw_score}, reasons={len(kw_reasons)}")
        
        # Layer 2: URL analysis
        url_score, url_reasons = analyze_urls(text)
        total_score += url_score
        all_reasons.extend(url_reasons)
        logger.debug(f"URL analysis: score={url_score}, reasons={len(url_reasons)}")
        
        # Layer 3: Behavioral indicators
        behavior_score, behavior_reasons = _analyze_behavioral_indicators(text)
        total_score += behavior_score
        all_reasons.extend(behavior_reasons)
        logger.debug(f"Behavioral analysis: score={behavior_score}, reasons={len(behavior_reasons)}")
        
        # Layer 4: Anomaly detection
        anomaly_score, anomaly_reasons = _analyze_anomalies(text)
        total_score += anomaly_score
        all_reasons.extend(anomaly_reasons)
        logger.debug(f"Anomaly analysis: score={anomaly_score}, reasons={len(anomaly_reasons)}")
        
        # Calculate final risk level
        risk_level = _calculate_risk_level(total_score)
        
        logger.info(
            f"Analysis complete - Total score: {total_score}, "
            f"Risk: {risk_level}, Indicators: {len(all_reasons)}"
        )
        
        # Return immutable result
        return AnalysisResult(
            score=total_score,
            risk_level=risk_level,
            reasons=all_reasons
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        raise
