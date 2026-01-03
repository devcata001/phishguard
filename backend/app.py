"""
PhishGuard API - Phishing Email Detection Service

Security-hardened Flask API implementing defense-in-depth principles:
- Input validation and sanitization
- Rate limiting
- Request size limits
- Security headers
- Structured logging
- Error handling without information leakage
"""

import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from analyzers.engine import analyze_email, AnalysisResult

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Security constants
MAX_REQUEST_SIZE = 1 * 1024 * 1024  # 1MB max request size
MAX_TEXT_LENGTH = 100_000  # Max characters in email text
RATE_LIMIT_REQUESTS = 30  # Max requests per window
RATE_LIMIT_WINDOW = 60  # Window in seconds

# Simple in-memory rate limiting (use Redis in production)
rate_limit_store: dict[str, list[float]] = defaultdict(list)


def get_client_ip() -> str:
    """Extract client IP with proxy support."""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For', '').split(',')[0].strip()
    return request.remote_addr or 'unknown'


def rate_limit(f: Callable) -> Callable:
    """Rate limiting decorator."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = get_client_ip()
        now = time.time()
        
        # Clean old entries
        rate_limit_store[client_ip] = [
            ts for ts in rate_limit_store[client_ip]
            if now - ts < RATE_LIMIT_WINDOW
        ]
        
        # Check rate limit
        if len(rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again later."
            }), 429
        
        # Record request
        rate_limit_store[client_ip].append(now)
        
        return f(*args, **kwargs)
    return decorated_function


def validate_text_input(text: Any) -> tuple[str | None, str | None]:
    """
    Validate and sanitize text input.
    Returns: (sanitized_text, error_message)
    """
    # Type check
    if not isinstance(text, str):
        return None, "Invalid input type: 'text' must be a string"
    
    # Length check
    if len(text) > MAX_TEXT_LENGTH:
        return None, f"Input too large: maximum {MAX_TEXT_LENGTH} characters allowed"
    
    # Empty check
    text = text.strip()
    if not text:
        return None, "Empty input: 'text' field cannot be empty"
    
    # Check for null bytes (potential injection)
    if '\x00' in text:
        logger.warning(f"Null byte detected in input from IP: {get_client_ip()}")
        return None, "Invalid characters in input"
    
    return text, None


def add_security_headers(response: Response) -> Response:
    """Add security headers to response."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = "default-src 'none'"
    response.headers['Referrer-Policy'] = 'no-referrer'
    
    # Remove server header
    response.headers.pop('Server', None)
    
    return response


def create_app() -> Flask:
    """Application factory with security hardening."""
    
    app = Flask(__name__)
    
    # Security configuration
    app.config['MAX_CONTENT_LENGTH'] = MAX_REQUEST_SIZE
    app.config['JSON_SORT_KEYS'] = False
    
    # CORS configuration - restrict in production
    CORS(app, 
         origins=["http://localhost:*", "http://127.0.0.1:*"],
         methods=["GET", "POST"],
         allow_headers=["Content-Type"])
    
    # Apply security headers to all responses
    @app.after_request
    def apply_security_headers(response: Response) -> Response:
        return add_security_headers(response)
    
    # Global error handlers
    @app.errorhandler(413)
    def request_too_large(e):
        logger.warning(f"Request too large from IP: {get_client_ip()}")
        return jsonify({
            "error": "Request too large",
            "message": f"Maximum request size is {MAX_REQUEST_SIZE} bytes"
        }), 413
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        return jsonify({
            "error": e.name,
            "message": e.description
        }), e.code
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(e):
        # Log full error but don't expose to client
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }), 500
    
    # Health check endpoint
    @app.get("/health")
    def health():
        """Health check endpoint for monitoring."""
        return jsonify({
            "status": "healthy",
            "service": "phishguard-api",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # Main analysis endpoint
    @app.post("/analyze")
    @rate_limit
    def analyze():
        """
        Analyze email content for phishing indicators.
        
        Request:
            POST /analyze
            Content-Type: application/json
            Body: {"text": "email content"}
        
        Response:
            {
                "risk_level": "SAFE"|"SUSPICIOUS"|"HIGH_RISK",
                "score": int,
                "reasons": [string],
                "analyzed_at": ISO timestamp
            }
        """
        client_ip = get_client_ip()
        
        # Parse JSON safely
        try:
            payload = request.get_json(force=False, silent=False)
        except Exception as e:
            logger.warning(f"Invalid JSON from IP {client_ip}: {str(e)}")
            return jsonify({
                "error": "Invalid JSON",
                "message": "Request body must be valid JSON"
            }), 400
        
        if not isinstance(payload, dict):
            return jsonify({
                "error": "Invalid request format",
                "message": "Request body must be a JSON object"
            }), 400
        
        # Extract and validate text
        text = payload.get("text")
        sanitized_text, error = validate_text_input(text)
        
        if error:
            logger.info(f"Validation error from IP {client_ip}: {error}")
            return jsonify({
                "error": "Validation error",
                "message": error
            }), 400
        
        # Perform analysis
        try:
            start_time = time.time()
            result: AnalysisResult = analyze_email(sanitized_text)
            analysis_time = time.time() - start_time
            
            logger.info(
                f"Analysis completed - IP: {client_ip}, "
                f"Risk: {result.risk_level}, Score: {result.score}, "
                f"Time: {analysis_time:.3f}s"
            )
            
            return jsonify({
                "risk_level": result.risk_level,
                "score": result.score,
                "reasons": result.reasons,
                "analyzed_at": datetime.utcnow().isoformat()
            }), 200
            
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}", exc_info=True)
            return jsonify({
                "error": "Analysis failed",
                "message": "Unable to analyze email content"
            }), 500
    
    return app


def main():
    """Entry point for production deployment."""
    app = create_app()
    
    # Use a production WSGI server like gunicorn in production:
    # gunicorn -w 4 -b 0.0.0.0:5000 app:create_app()
    
    logger.info("Starting PhishGuard API in development mode...")
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,  # Never use debug=True in production
        threaded=True
    )


if __name__ == "__main__":
    main()
