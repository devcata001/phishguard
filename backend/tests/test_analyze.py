from __future__ import annotations

from analyzers.engine import analyze_email


def test_safe_email_low_score():
    text = "Hello team,\n\nThe meeting is tomorrow at 10am.\n\nThanks"
    result = analyze_email(text)
    assert result.risk_level == "SAFE"
    assert result.score >= 0


def test_phishy_email_high_risk():
    text = """Subject: Urgent — verify your account immediately!!!

Your account will be locked. Click here to verify your account:
http://192.168.0.1/login
"""
    result = analyze_email(text)
    assert result.score >= 60
    assert result.risk_level == "HIGH_RISK"
    assert len(result.reasons) > 0
