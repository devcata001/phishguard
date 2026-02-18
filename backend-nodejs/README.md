# PhishGuard Backend - Node.js/Express

**Production-ready AI-powered phishing email detection API built with Node.js and Express.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🚀 Features

### Multi-Layer Detection

- **AI Analysis**: Google Gemini API integration for deep content analysis
- **Heuristic Detection**: Keyword scanning, URL validation, behavioral indicators
- **Dual-Mode Operation**: AI-enhanced or heuristics-only fallback

### Security Hardening

- ✅ Rate limiting (30 req/min per IP)
- ✅ Input validation and sanitization
- ✅ Request size limits (1MB max)
- ✅ Security headers (Helmet.js)
- ✅ CORS protection
- ✅ Error handling without information leakage

### Production Features

- 🎯 Real-time analysis (<1s response time)
- 📊 Structured logging with Winston
- 🐳 Docker support
- 🧪 Comprehensive test suite (Jest)
- 📈 Health monitoring endpoint
- 🔄 Graceful shutdown handling

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)

---

## 🏃 Quick Start

### Prerequisites

- **Node.js** v18+ and npm v9+
- **Google Gemini API Key** (optional, for AI features)

### Installation

```bash
# Clone the repository
cd backend-nodejs

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env and add your GEMINI_API_KEY (optional)
nano .env
```

### Running Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

The API will be available at `http://localhost:5000`

### Verify Installation

```bash
# Check health
curl http://localhost:5000/health

# Test analysis
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Your account will be suspended! Click here immediately!"}'
```

---

## 📚 API Documentation

### Endpoints

#### `POST /analyze`

Analyze email content for phishing indicators.

**Request:**

```json
{
  "text": "Email content to analyze..."
}
```

**Response:**

```json
{
  "risk_score": 85,
  "risk_level": "HIGH_RISK",
  "flags": [
    "Urgency indicators detected: urgent, immediate, act now",
    "Suspicious URL: http://192.168.1.1/login",
    "AI Analysis (92% confidence): Impersonation attempt, Credential theft"
  ],
  "ai_analysis": {
    "enabled": true,
    "confidence": 0.92,
    "model": "PhishGuard AI v2.0 (Google Gemini)"
  },
  "metadata": {
    "analysis_version": "2.0",
    "timestamp": "2026-02-18T10:30:00.000Z",
    "detection_layers": ["ai", "heuristic"]
  }
}
```

**Risk Levels:**

- `SAFE` (0-39): Low risk, likely legitimate
- `SUSPICIOUS` (40-69): Medium risk, review recommended
- `HIGH_RISK` (70-100): High risk, likely phishing

**Status Codes:**

- `200 OK`: Analysis successful
- `400 Bad Request`: Invalid input
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

#### `GET /health`

Health check endpoint for monitoring.

**Response:**

```json
{
  "status": "healthy",
  "service": "PhishGuard API",
  "version": "2.0.0",
  "uptime": {
    "seconds": 3600,
    "formatted": "1h 0m 0s"
  },
  "features": {
    "ai_analysis": true,
    "heuristic_analysis": true,
    "rate_limiting": true
  }
}
```

---

## 🏗️ Architecture

```
backend-nodejs/
├── server.js                    # Express app entry point
├── config.js                    # Environment configuration
├── package.json                 # Dependencies and scripts
│
├── controllers/
│   └── detectionController.js  # Orchestrates detection layers
│
├── services/
│   ├── aiService.js            # Google Gemini integration
│   ├── heuristicService.js     # Combines heuristic analyses
│   ├── keywordService.js       # Keyword/behavioral detection
│   └── urlService.js           # URL analysis
│
├── routes/
│   ├── analyze.js              # POST /analyze route
│   └── health.js               # GET /health route
│
├── middleware/
│   ├── errorHandler.js         # Error handling
│   ├── rateLimiter.js          # Rate limiting
│   ├── security.js             # Security headers
│   └── validation.js           # Input validation (Joi)
│
├── utils/
│   ├── logger.js               # Winston logging
│   └── riskScorer.js           # Risk scoring logic
│
├── __tests__/                  # Jest test suites
│   ├── api.test.js
│   ├── heuristic.test.js
│   └── riskScorer.test.js
│
└── Dockerfile                   # Docker configuration
```

### Detection Flow

```
Email Input
    ↓
Input Validation & Sanitization
    ↓
┌─────────────────┬─────────────────┐
│   AI Analysis   │    Heuristic    │
│  (Google Gemini)│    Analysis     │
└────────┬────────┴────────┬────────┘
         │                 │
         └────── Combine ──┘
                 ↓
         Risk Scoring (0-100)
                 ↓
         Risk Level Mapping
                 ↓
         Response with Flags
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
NODE_ENV=production              # development | production | testing
PORT=5000                        # Server port
HOST=0.0.0.0                    # Bind host (0.0.0.0 for Docker)

# Security Configuration
MAX_REQUEST_SIZE=1mb             # Maximum request body size
MAX_TEXT_LENGTH=100000           # Maximum email text length
RATE_LIMIT_REQUESTS=30           # Max requests per window
RATE_LIMIT_WINDOW_MS=60000       # Rate limit window (milliseconds)

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com

# AI Configuration
GEMINI_API_KEY=your_api_key_here # Google Gemini API key (optional)

# Logging
LOG_LEVEL=info                   # debug | info | warn | error
```

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key"
4. Copy the key to your `.env` file

**Note:** The system works without an API key using heuristics-only mode.

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build image
docker build -t phishguard-api .

# Run container
docker run -d \
  -p 5000:5000 \
  --env-file .env \
  --name phishguard-api \
  phishguard-api

# Check logs
docker logs -f phishguard-api

# Stop container
docker stop phishguard-api
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Render.com Deployment

1. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "Node.js backend implementation"
   git push
   ```

2. **Deploy on Render:**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select `backend-nodejs` as root directory
   - Click "Create Web Service"

3. **Set Environment Variables:**
   - In Render dashboard, add `GEMINI_API_KEY`
   - Adjust other variables as needed

4. **Configure:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`

### Manual Server Deployment

```bash
# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start server.js --name phishguard-api

# Configure auto-restart
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs phishguard-api
```

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- __tests__/api.test.js

# Watch mode (auto-rerun on changes)
npm run test:watch
```

### Test Coverage

The test suite includes:

- ✅ Unit tests for all services
- ✅ Integration tests for API endpoints
- ✅ Input validation tests
- ✅ Rate limiting tests
- ✅ Error handling tests

**Coverage Targets:**

- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

### Manual Testing

```bash
# Safe email
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Hi team, meeting at 2pm tomorrow. Thanks!"}'

# Phishing email
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "URGENT! Account suspended! Verify now: http://192.168.1.1/login"}'

# Invalid request (should return 400)
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": ""}'
```

---

## 🔒 Security

### Security Features

1. **Input Validation**
   - Schema validation with Joi
   - Sanitization of user inputs
   - Null byte detection
   - Size limits enforced

2. **Rate Limiting**
   - Per-IP rate limiting
   - Configurable thresholds
   - 429 responses with retry-after

3. **Security Headers**
   - Helmet.js integration
   - CSP, HSTS, X-Frame-Options
   - XSS protection headers

4. **Error Handling**
   - No stack traces in production
   - Generic error messages
   - Structured logging without PII

5. **CORS Protection**
   - Whitelist-based origins
   - Credentials support
   - Preflight handling

### Security Best Practices

- ✅ Run as non-root user in Docker
- ✅ Use environment variables for secrets
- ✅ Enable HTTPS in production
- ✅ Keep dependencies updated
- ✅ Monitor logs for suspicious activity
- ✅ Use rate limiting to prevent abuse

### Vulnerability Scanning

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# View detailed report
npm audit --json
```

---

## 📊 Performance

### Benchmarks

| Metric                         | Target | Actual |
| ------------------------------ | ------ | ------ |
| Response Time (Heuristic Only) | <100ms | ~50ms  |
| Response Time (AI + Heuristic) | <1s    | ~800ms |
| Concurrent Requests            | 100/s  | ✅     |
| Memory Usage                   | <512MB | ~150MB |

### Optimization Tips

1. **Enable AI Caching**: Cache AI responses for repeated content
2. **Use Redis for Rate Limiting**: Better performance in distributed systems
3. **Enable Compression**: Add compression middleware for large responses
4. **Horizontal Scaling**: Run multiple instances behind a load balancer

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/phishguard/issues)
- **Documentation**: This README
- **Security Issues**: Report privately to security@example.com

---

## 🎯 Roadmap

- [ ] Redis integration for distributed rate limiting
- [ ] Prometheus metrics endpoint
- [ ] WebSocket support for real-time analysis
- [ ] ML model training pipeline
- [ ] Admin dashboard
- [ ] Multi-language support

---

**Built with ❤️ for cybersecurity**
