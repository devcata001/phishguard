"""
Advanced Keyword and Pattern Analysis for Phishing Detection

Implements pattern matching with:
- Weighted scoring based on threat severity
- Context-aware detection
- Regular expression patterns for advanced matching
- False positive reduction through context analysis
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Pattern


@dataclass(frozen=True)
class KeywordRule:
    """Immutable keyword detection rule."""
    phrase: str
    score: int
    reason: str
    is_regex: bool = False
    _compiled_pattern: Pattern | None = None
    
    def __post_init__(self):
        """Compile regex patterns at initialization."""
        if self.is_regex:
            object.__setattr__(self, '_compiled_pattern', re.compile(self.phrase, re.IGNORECASE))


# High-severity patterns (20-30 points)
HIGH_SEVERITY_RULES = [
    KeywordRule(
        "verify your account",
        25,
        "Account verification request - classic phishing tactic"
    ),
    KeywordRule(
        "confirm your password",
        30,
        "Direct password request - major security red flag"
    ),
    KeywordRule(
        "update your payment",
        25,
        "Payment update request - potential financial fraud"
    ),
    KeywordRule(
        r"\b(update|verify|confirm).*\b(billing|payment|card)\b",
        25,
        "Financial information update request",
        is_regex=True
    ),
    KeywordRule(
        "account will be (locked|closed|suspended|terminated)",
        22,
        "Account termination threat - pressure tactic"
    ),
    KeywordRule(
        "wire transfer",
        28,
        "Wire transfer request - common in BEC attacks"
    ),
    KeywordRule(
        r"\bgift card\b",
        26,
        "Gift card request - major scam indicator",
        is_regex=True
    ),
    KeywordRule(
        "reset your password",
        22,
        "Password reset prompt - credential phishing"
    ),
    KeywordRule(
        r"\b(ssn|social security number|tax id)\b",
        30,
        "Requests Social Security Number - identity theft risk",
        is_regex=True
    ),
]

# Medium-severity patterns (10-19 points)
MEDIUM_SEVERITY_RULES = [
    KeywordRule(
        "urgent",
        12,
        "Urgency language used to bypass judgment"
    ),
    KeywordRule(
        "immediately",
        12,
        "Immediate action required - pressure tactic"
    ),
    KeywordRule(
        "suspended",
        15,
        "Account suspension claim - fear manipulation"
    ),
    KeywordRule(
        "unusual activity",
        15,
        "Unusual activity alert - panic inducement"
    ),
    KeywordRule(
        r"\bunauthorized (access|transaction|charge)\b",
        16,
        "Unauthorized activity claim - social engineering",
        is_regex=True
    ),
    KeywordRule(
        "security alert",
        14,
        "Security alert - may be fake warning"
    ),
    KeywordRule(
        r"\b(act now|limited time|expires|deadline)\b",
        11,
        "Time-pressure language",
        is_regex=True
    ),
    KeywordRule(
        r"\bverif(y|ication)\b.*\bidentity\b",
        18,
        "Identity verification request",
        is_regex=True
    ),
    KeywordRule(
        "click here to",
        10,
        "Generic 'click here' call-to-action with weak context"
    ),
    KeywordRule(
        r"\b(claim|collect).*\b(prize|reward|refund)\b",
        17,
        "Prize/reward claim - lottery scam pattern",
        is_regex=True
    ),
]

# Low-severity indicators (5-9 points)
LOW_SEVERITY_RULES = [
    KeywordRule(
        "login",
        8,
        "Login reference - often paired with phishing links"
    ),
    KeywordRule(
        "confidential",
        7,
        "Confidentiality claim - false trust building"
    ),
    KeywordRule(
        r"\bdear (customer|user|member|valued)\b",
        6,
        "Generic greeting - mass email indicator",
        is_regex=True
    ),
    KeywordRule(
        "congratulations",
        9,
        "Congratulations message - potential prize scam"
    ),
    KeywordRule(
        r"\bfree\b.*\b(money|cash|gift|iphone|ipad)\b",
        14,
        "Free money/gift offer - too good to be true",
        is_regex=True
    ),
    KeywordRule(
        r"\b(click|tap).*\b(link|button|below)\b",
        8,
        "Action prompt with link reference",
        is_regex=True
    ),
]

# Combine all rules
DEFAULT_RULES: list[KeywordRule] = (
    HIGH_SEVERITY_RULES + 
    MEDIUM_SEVERITY_RULES + 
    LOW_SEVERITY_RULES
)


def _check_false_positive_context(text: str, matched_phrase: str) -> bool:
    """
    Check if a match might be a false positive based on context.
    
    Returns True if likely false positive, False otherwise.
    """
    text_lower = text.lower()
    
    # Check for legitimate service email indicators
    legitimate_indicators = [
        'unsubscribe',
        'privacy policy',
        'customer support',
        'help center',
        'contact us at',
    ]
    
    # If multiple legitimate indicators present, might be real service email
    legitimate_count = sum(1 for indicator in legitimate_indicators if indicator in text_lower)
    
    # Don't suppress high-risk keywords even in legitimate contexts
    high_risk = ['password', 'payment', 'wire transfer', 'gift card', 'ssn']
    if any(risk in matched_phrase.lower() for risk in high_risk):
        return False
    
    return legitimate_count >= 2


def scan_keywords(
    text: str,
    rules: list[KeywordRule] | None = None,
    enable_context_check: bool = True
) -> tuple[int, list[str]]:
    """
    Scan email text for suspicious keywords and patterns.
    
    Args:
        text: Email content to analyze
        rules: Custom rules (uses DEFAULT_RULES if None)
        enable_context_check: Enable false positive reduction
    
    Returns:
        Tuple of (total_score, list_of_reasons)
    """
    if not text or not text.strip():
        return 0, []
    
    rules = rules or DEFAULT_RULES
    text_lower = text.lower()
    
    score = 0
    reasons: list[str] = []
    matched_phrases: set[str] = set()  # Avoid duplicate matches
    
    for rule in rules:
        matched = False
        match_text = ""
        
        if rule.is_regex and rule._compiled_pattern:
            # Regex matching
            match = rule._compiled_pattern.search(text)
            if match:
                matched = True
                match_text = match.group(0)
        else:
            # Simple substring matching
            if rule.phrase.lower() in text_lower:
                matched = True
                match_text = rule.phrase
        
        if matched and match_text not in matched_phrases:
            # Check for false positive context
            if enable_context_check and _check_false_positive_context(text, match_text):
                continue
            
            matched_phrases.add(match_text)
            score += rule.score
            reasons.append(f"⚠ Pattern detected: '{match_text}' — {rule.reason}")
    
    return score, reasons
