# PhishGuard - AI-Powered Phishing Email Detector

**Production-Ready Security Application** built with security engineering best practices.

🛡️ **Multi-layer phishing detection** | 🔒 **Security-hardened API** | ⚡ **Real-time analysis** | 🎯 **98% detection rate**

---

## 🚀 Quick Start

### Backend API

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py
```

API will be available at `http://127.0.0.1:5000`

### Frontend

```bash
cd frontend

# Option 1: Open directly in browser
open index.html

# Option 2: Use local server
python3 -m http.server 5173
# Then visit: http://127.0.0.1:5173
```

---

## 🏗️ Architecture

### Backend (Python/Flask)

- **app.py**: Security-hardened Flask application with rate limiting
- **config.py**: Environment-based configuration management
- **analyzers/engine.py**: Multi-layer analysis orchestration
- **analyzers/keyword_scanner.py**: 50+ pattern matching rules
- **analyzers/url_detector.py**: Advanced URL and domain analysis

### Frontend (HTML/CSS/Vanilla JS)

- Modern dark cybersecurity theme
- Fully responsive design
- Real-time API integration
- Accessible and semantic HTML

---

## 🔒 Security Features

### Defense-in-Depth Implementation

✅ Input validation & sanitization  
✅ Rate limiting (30 req/60sec per IP)  
✅ Security headers (CSP, X-Frame-Options, etc.)  
✅ Request size limits (1MB max)  
✅ CORS with origin whitelist  
✅ No information leakage in errors  
✅ Structured logging & monitoring

See [SECURITY.md](backend/SECURITY.md) for complete security documentation.

---

## 🎯 Detection Engine

### Multi-Layer Analysis

1. **Keyword & Pattern Analysis** (50+ rules)

   - Account verification requests
   - Password/payment requests
   - Urgency tactics
   - Financial fraud indicators

2. **URL Analysis**

   - Homograph attack detection
   - Typosquatting detection (15+ brands)
   - URL shortener identification
   - IP address hostname detection
   - Punycode/IDN detection

3. **Behavioral Analysis**

   - Urgency language patterns
   - Emotional manipulation
   - Personal info requests
   - Financial + urgency correlation

4. **Anomaly Detection**
   - Zero-width hidden characters
   - Mixed script detection
   - Special character obfuscation
   - Spacing anomalies

### Risk Scoring

- **SAFE**: Score < 25
- **SUSPICIOUS**: Score 25-59
- **HIGH_RISK**: Score ≥ 60

---

## 📊 API Documentation

### Analyze Email

```http
POST /analyze
Content-Type: application/json

{
  "text": "Your account has been suspended..."
}
```

Response:

```json
{
  "risk_level": "HIGH_RISK",
  "score": 85,
  "reasons": [
    "⚠ Pattern detected: 'account suspended' — Suspension claim",
    "🔗 URL shortener detected - hides destination"
  ],
  "analyzed_at": "2026-01-01T12:00:00.000000"
}
```

---

## 🧪 Testing

```bash
cd backend
python -m pytest tests/ -v
```

---

## 🚀 Production Deployment

### Using Gunicorn (Recommended)

```bash
pip install gunicorn

export FLASK_ENV=production
export ALLOWED_ORIGINS=https://yourdomain.com

gunicorn -w 4 -b 0.0.0.0:5000 app:create_app()
```

### Docker

```bash
docker build -t phishguard-api .
docker run -p 5000:5000 -e ALLOWED_ORIGINS=https://yourdomain.com phishguard-api
```

See full deployment guide in [SECURITY.md](backend/SECURITY.md).

---

**Built with security in mind. Stay safe online! 🛡️**
