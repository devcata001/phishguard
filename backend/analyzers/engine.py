"""
AI-Powered Phishing Detection Engine

Multi-layer analysis engine combining AI and heuristic techniques:
- AI Model (Primary): Transformer-based deep learning
- Keyword and pattern analysis (Secondary)
- URL and domain validation
- Behavioral indicators
- Anomaly detection
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

from .keyword_scanner import scan_keywords
from .url_detector import analyze_urls

# Try to import AI model (graceful fallback)
try:
    from .ai_model import analyze_with_ai, AIAnalysisResult
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logging.warning("AI model not available - using heuristic analysis only")

logger = logging.getLogger(__name__)

# Risk thresholds
RISK_HIGH_THRESHOLD = 60
RISK_SUSPICIOUS_THRESHOLD = 25
RISK_SAFE_THRESHOLD = 0


@dataclass(frozen=True)
class AnalysisResult:
    """Immutable analysis result with AI integration."""
    score: int
    risk_level: str
    reasons: list[str]
    ai_confidence: Optional[float] = None
    ai_prediction: Optional[str] = None
    
    def __post_init__(self):
        """Validate result integrity."""
        if self.score < 0:
            raise ValueError("Score cannot be negative")
        if self.risk_level not in {"SAFE", "SUSPICIOUS", "HIGH_RISK"}:
            raise ValueError(f"Invalid risk level: {self.risk_level}")
        if not isinstance(self.reasons, list):
            raise ValueError("Reasons must be a list")


def _calculate_risk_level(score: int) -> str:
    """Map numerical score to categorical risk level."""
    if score >= RISK_HIGH_THRESHOLD:
        return "HIGH_RISK"
    if score >= RISK_SUSPICIOUS_THRESHOLD:
        return "SUSPICIOUS"
    return "SAFE"


def _analyze_behavioral_indicators(text: str) -> tuple[int, list[str]]:
    """Detect behavioral manipulation tactics."""
    score = 0
    reasons = []
    
    text_lower = text.lower()
    
    # Urgency indicators
    urgency_count = sum(1 for phrase in [
        'urgent', 'immediate', 'act now', 'limited time',
        'expires', 'hurry', 'quick', 'immediately'
    ] if phrase in text_lower)
    
    if urgency_count >= 3:
        score += 12
        reasons.append("Multiple urgency tactics detected")
    elif urgency_count >= 2:
        score += 6
        reasons.append("Urgency language detected")
    
    # Exclamation marks
    exclamation_count = text.count('!')
    if exclamation_count >= 5:
        score += 8
        reasons.append(f"Excessive exclamation marks ({exclamation_count})")
    
    # All caps words
    words = text.split()
    caps_words = [w for w in words if len(w) > 3 and w.isupper() and w.isalpha()]
    if len(caps_words) >= 5:
        score += 7
        reasons.append("Multiple all-caps words detected")
    
    # Personal information requests
    sensitive_requests = [
        r'\b(password|ssn|social security|credit card|cvv|pin)\b',
        r'\b(bank account|routing number|account number)\b',
        r'\b(verify.*account|confirm.*identity|update.*information)\b'
    ]
    
    for pattern in sensitive_requests:
        if re.search(pattern, text_lower):
            score += 15
            reasons.append("Requests sensitive personal information")
            break
    
    # Currency with urgency
    if re.search(r'[\$£€¥]\s*\d+', text) and urgency_count > 0:
        score += 8
        reasons.append("Financial amounts with urgency detected")
    
    return score, reasons


def _analyze_anomalies(text: str) -> tuple[int, list[str]]:
    """Detect text anomalies and suspicious patterns."""
    score = 0
    reasons = []
    
    # Excessive spacing
    if re.search(r'\s{5,}', text):
        score += 5
        reasons.append("Unusual spacing detected")
    
    # Mixed scripts
    suspicious_chars = ['а', 'е', 'о', 'р', 'с', 'у', 'х']  # Cyrillic lookalikes
    if any(char in text for char in suspicious_chars):
        score += 10
        reasons.append("Suspicious characters detected (homograph attack)")
    
    # Hidden text
    zero_width_chars = ['\u200b', '\u200c', '\u200d', '\ufeff']
    if any(char in text for char in zero_width_chars):
        score += 12
        reasons.append("Hidden zero-width characters detected")
    
    # Excessive special characters
    special_char_ratio = sum(1 for c in text if not c.isalnum() and not c.isspace()) / max(len(text), 1)
    if special_char_ratio > 0.15:
        score += 6
        reasons.append("High ratio of special characters")
    
    return score, reasons


def analyze_email(text: str) -> AnalysisResult:
    """
    AI-powered comprehensive phishing analysis.
    
    Primary: AI model prediction (if available)
    Secondary: Heuristic analysis for validation
    
    Args:
        text: Raw email content
    
    Returns:
        AnalysisResult with AI-enhanced risk assessment
    """
    if not isinstance(text, str):
        raise ValueError("Input must be a string")
    
    if not text.strip():
        raise ValueError("Input cannot be empty")
    
    all_reasons: list[str] = []
    ai_confidence = None
    ai_prediction = None
    
    # ===========================================
    # PRIMARY: AI Model Analysis
    # ===========================================
    ai_score = 0
    
    if AI_AVAILABLE:
        try:
            logger.info("Running AI model analysis...")
            ai_result: AIAnalysisResult = analyze_with_ai(text)
            
            ai_confidence = ai_result.confidence
            ai_prediction = "PHISHING" if ai_result.is_phishing else "LEGITIMATE"
            
            # AI contributes heavily to score
            if ai_result.is_phishing:
                # Scale: 50-90 based on confidence
                ai_score = int(50 + (ai_result.confidence * 40))
                all_reasons.insert(0, f"🤖 AI Model: {ai_result.confidence*100:.1f}% confidence PHISHING")
            else:
                # Legitimate but not zero (allow heuristics to catch edge cases)
                ai_score = int((1 - ai_result.confidence) * 20)
                all_reasons.insert(0, f"✅ AI Model: {ai_result.confidence*100:.1f}% confidence LEGITIMATE")
            
            # Add AI-identified risk factors
            all_reasons.extend(ai_result.risk_factors[:3])
            
            logger.info(
                f"AI Analysis: {ai_prediction} "
                f"(confidence: {ai_confidence:.2%}, score: {ai_score})"
            )
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}", exc_info=True)
            all_reasons.append("⚠️  AI analysis unavailable - using heuristics")
    else:
        logger.warning("AI model not available - using heuristic analysis only")
        all_reasons.append("ℹ️  Using heuristic analysis (AI model not loaded)")
    
    # ===========================================
    # SECONDARY: Heuristic Analysis
    # ===========================================
    heuristic_weight = 0.3 if AI_AVAILABLE and ai_score > 0 else 1.0
    
    # Layer 1: Keyword analysis
    kw_score, kw_reasons = scan_keywords(text)
    kw_score = int(kw_score * heuristic_weight)
    all_reasons.extend(kw_reasons[:3])
    logger.debug(f"Keyword analysis: {kw_score}")
    
    # Layer 2: URL analysis
    url_score, url_reasons = analyze_urls(text)
    url_score = int(url_score * heuristic_weight)
    all_reasons.extend(url_reasons[:3])
    logger.debug(f"URL analysis: {url_score}")
    
    # Layer 3: Behavioral indicators
    behavior_score, behavior_reasons = _analyze_behavioral_indicators(text)
    behavior_score = int(behavior_score * heuristic_weight)
    all_reasons.extend(behavior_reasons[:2])
    logger.debug(f"Behavioral analysis: {behavior_score}")
    
    # Layer 4: Anomaly detection
    anomaly_score, anomaly_reasons = _analyze_anomalies(text)
    anomaly_score = int(anomaly_score * heuristic_weight)
    all_reasons.extend(anomaly_reasons[:2])
    logger.debug(f"Anomaly analysis: {anomaly_score}")
    
    # ===========================================
    # FINAL SCORE CALCULATION
    # ===========================================
    total_score = ai_score + kw_score + url_score + behavior_score + anomaly_score
    total_score = min(total_score, 100)  # Cap at 100
    
    risk_level = _calculate_risk_level(total_score)
    
    logger.info(
        f"Final Analysis - Score: {total_score}, "
        f"Risk: {risk_level}, "
        f"AI: {ai_prediction} ({ai_confidence:.2%} conf)" if ai_confidence else f"Risk: {risk_level}"
    )
    
    return AnalysisResult(
        score=total_score,
        risk_level=risk_level,
        reasons=all_reasons[:15],  # Limit to top 15
        ai_confidence=ai_confidence,
        ai_prediction=ai_prediction
    )
