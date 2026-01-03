"""
Real AI phishing detector using Google Gemini API.
Gemini reads and analyzes the actual message content.
"""

import logging
import json
import os
import urllib.request
import urllib.error
from dataclasses import dataclass
from typing import Dict, List

logger = logging.getLogger(__name__)


@dataclass
class AIAnalysisResult:
    """Result from AI model analysis."""
    is_phishing: bool
    confidence: float
    phishing_probability: float
    legitimate_probability: float
    risk_factors: List[str]
    model_name: str

    def to_dict(self) -> Dict:
        return {
            'is_phishing': self.is_phishing,
            'confidence': round(self.confidence, 3),
            'phishing_probability': round(self.phishing_probability, 3),
            'legitimate_probability': round(self.legitimate_probability, 3),
            'risk_factors': self.risk_factors,
            'model_name': self.model_name
        }


class GeminiAI:
    """Real AI using Google Gemini to analyze messages."""
    
    def __init__(self):
        self.model_name = "PhishGuard AI v5.0 (Google Gemini)"
        self.api_key = os.environ.get('GEMINI_API_KEY', '')
        
        if not self.api_key:
            logger.warning("No GEMINI_API_KEY found.")
        else:
            logger.info(f"Initialized {self.model_name} with API key")
    
    def analyze(self, text: str) -> AIAnalysisResult:
        """Let Gemini AI read and analyze the message."""
        
        if not text or len(text.strip()) < 10:
            return AIAnalysisResult(
                is_phishing=False,
                confidence=0.5,
                phishing_probability=0.0,
                legitimate_probability=1.0,
                risk_factors=["Text too short"],
                model_name=self.model_name
            )
        
        if not self.api_key:
            logger.error("No API key - using fallback")
            return self._fallback_analysis(text)
        
        try:
            prompt = f"""You are a cybersecurity expert analyzing emails for phishing. Be balanced and accurate.

MESSAGE:
{text}

Analyze carefully. Only flag as phishing if there are CLEAR indicators like:
- Fake login URLs (typosquatting like "amaz0n.com" or "paypa1.com")
- Requests for passwords, SSN, credit cards
- Urgent threats about account suspension
- Prize/lottery scams
- Suspicious shortened or obfuscated links

Normal business emails, meeting requests, newsletters are NOT phishing.

Respond with ONLY this JSON format:
{{"is_phishing": true, "confidence": 0.95, "risk_factors": ["specific reason 1", "specific reason 2"]}}

Or if safe:
{{"is_phishing": false, "confidence": 0.90, "risk_factors": ["why it appears legitimate"]}}"""

            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
            
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024}
            }
            
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(api_url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
            
            logger.info(f"Gemini raw response: {result}")
            
            # Parse Gemini response
            if 'candidates' in result and len(result['candidates']) > 0:
                content = result['candidates'][0]['content']['parts'][0]['text']
                logger.info(f"Gemini content: {content}")
                
                # Clean the response - remove markdown if present
                content = content.strip()
                if content.startswith('```'):
                    content = content.split('\n', 1)[1] if '\n' in content else content
                if content.endswith('```'):
                    content = content.rsplit('```', 1)[0]
                content = content.strip()
                
                # Extract JSON
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                
                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    logger.info(f"Parsing JSON: {json_str}")
                    analysis = json.loads(json_str)
                    
                    is_phishing = analysis.get('is_phishing', False)
                    confidence = float(analysis.get('confidence', 0.5))
                    risk_factors = analysis.get('risk_factors', [])
                    
                    # Ensure risk_factors is a list
                    if isinstance(risk_factors, str):
                        risk_factors = [risk_factors]
                    
                    phishing_prob = confidence if is_phishing else (1.0 - confidence)
                    legit_prob = 1.0 - phishing_prob
                    
                    logger.info(f"GEMINI RESULT: phishing={is_phishing}, confidence={confidence}")
                    
                    return AIAnalysisResult(
                        is_phishing=is_phishing,
                        confidence=confidence,
                        phishing_probability=phishing_prob,
                        legitimate_probability=legit_prob,
                        risk_factors=risk_factors[:8],
                        model_name=self.model_name + " (Gemini API)"
                    )
            
            logger.error("Could not parse Gemini response")
            return self._fallback_analysis(text)
            
        except Exception as e:
            logger.error(f"Gemini error: {str(e)}")
            return self._fallback_analysis(text)
    
    def _fallback_analysis(self, text: str) -> AIAnalysisResult:
        """Fallback when Gemini fails."""
        text_lower = text.lower()
        score = 0
        factors = []
        
        if 'verify' in text_lower or 'suspended' in text_lower:
            score += 40
            factors.append("Account threat detected")
        
        if 'password' in text_lower:
            score += 30
            factors.append("Password request")
        
        if 'urgent' in text_lower or 'immediately' in text_lower:
            score += 20
            factors.append("Urgency tactics")
        
        if 'click here' in text_lower:
            score += 20
            factors.append("Suspicious link")
        
        phishing_prob = min(score / 100.0, 1.0)
        is_phishing = phishing_prob >= 0.5
        
        return AIAnalysisResult(
            is_phishing=is_phishing,
            confidence=abs(phishing_prob - 0.5) * 2,
            phishing_probability=phishing_prob,
            legitimate_probability=1.0 - phishing_prob,
            risk_factors=factors if factors else ["Fallback analysis"],
            model_name=self.model_name + " (Fallback)"
        )


_detector = None

def get_ai_detector() -> GeminiAI:
    global _detector
    if _detector is None:
        _detector = GeminiAI()
    return _detector

def analyze_with_ai(text: str) -> AIAnalysisResult:
    detector = get_ai_detector()
    return detector.analyze(text)
