# API Reference

Complete API documentation for PhishGuard Backend v2.0

## Base URL

```
Development: http://localhost:5000
Production: https://your-api-domain.com
```

---

## Authentication

Currently, no authentication is required for the public API endpoints. The AI service uses an internal API key configured via environment variables.

---

## Endpoints

### 1. Analyze Email

Analyze email content for phishing indicators using AI and heuristic detection.

#### Request

```http
POST /analyze
Content-Type: application/json
```

**Body Parameters:**

| Parameter | Type   | Required | Description              | Max Length |
| --------- | ------ | -------- | ------------------------ | ---------- |
| text      | string | Yes      | Email content to analyze | 100,000    |

**Example Request:**

```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your account will be suspended! Click here immediately to verify: http://192.168.1.1/login"
  }'
```

```json
{
  "text": "URGENT! Your account will be locked. Verify now at http://suspicious-site.com"
}
```

#### Response

**Success Response (200 OK):**

```json
{
  "risk_score": 85,
  "risk_level": "HIGH_RISK",
  "flags": [
    "Urgency indicators detected: urgent, locked, verify now",
    "Suspicious URL: http://suspicious-site.com",
    "AI Analysis (92% confidence): Impersonation attempt, Urgency tactics"
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

**Response Schema:**

| Field                     | Type    | Description                          |
| ------------------------- | ------- | ------------------------------------ |
| risk_score                | integer | Risk score (0-100)                   |
| risk_level                | string  | SAFE, SUSPICIOUS, or HIGH_RISK       |
| flags                     | array   | List of detected phishing indicators |
| ai_analysis.enabled       | boolean | Whether AI analysis was used         |
| ai_analysis.confidence    | number  | AI confidence score (0.0-1.0)        |
| ai_analysis.model         | string  | AI model name                        |
| metadata.analysis_version | string  | API version                          |
| metadata.timestamp        | string  | ISO 8601 timestamp                   |
| metadata.detection_layers | array   | Detection methods used               |

**Risk Levels:**

- `SAFE` (0-39): Low risk, likely legitimate email
- `SUSPICIOUS` (40-69): Medium risk, requires review
- `HIGH_RISK` (70-100): High risk, likely phishing attempt

**Error Responses:**

**400 Bad Request:**

```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "text",
      "message": "Field \"text\" is required"
    }
  ]
}
```

**413 Payload Too Large:**

```json
{
  "error": "Payload Too Large",
  "message": "Request payload too large"
}
```

**429 Too Many Requests:**

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

**500 Internal Server Error:**

```json
{
  "error": "Internal Server Error",
  "message": "An error occurred processing your request"
}
```

---

### 2. Health Check

Get API health status and configuration information.

#### Request

```http
GET /health
```

**Example Request:**

```bash
curl http://localhost:5000/health
```

#### Response

**Success Response (200 OK):**

```json
{
  "status": "healthy",
  "service": "PhishGuard API",
  "version": "2.0.0",
  "engine": "Node.js/Express",
  "uptime": {
    "milliseconds": 3600000,
    "seconds": 3600,
    "formatted": "1h 0m 0s"
  },
  "features": {
    "ai_analysis": true,
    "heuristic_analysis": true,
    "rate_limiting": true,
    "input_validation": true
  },
  "configuration": {
    "environment": "production",
    "max_text_length": 100000,
    "rate_limit": "30 requests per 60s"
  },
  "endpoints": {
    "analyze": "POST /analyze",
    "health": "GET /health"
  },
  "timestamp": "2026-02-18T10:30:00.000Z"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit**: 30 requests per minute per IP address
- **Headers**: Standard `RateLimit-*` headers included in responses
- **Exceeded**: Returns `429 Too Many Requests`

**Rate Limit Headers:**

```
RateLimit-Limit: 30
RateLimit-Remaining: 25
RateLimit-Reset: 1645180800
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### Error Codes

| Status Code | Error Type            | Description                        |
| ----------- | --------------------- | ---------------------------------- |
| 400         | Bad Request           | Invalid input or malformed request |
| 404         | Not Found             | Endpoint does not exist            |
| 413         | Payload Too Large     | Request body exceeds size limit    |
| 429         | Too Many Requests     | Rate limit exceeded                |
| 500         | Internal Server Error | Server-side error                  |

---

## Examples

### Example 1: Safe Email

**Request:**

```json
{
  "text": "Hi team, just a reminder that our weekly meeting is tomorrow at 2pm. See you all there!"
}
```

**Response:**

```json
{
  "risk_score": 0,
  "risk_level": "SAFE",
  "flags": [],
  "ai_analysis": {
    "enabled": true,
    "confidence": 0.95,
    "model": "PhishGuard AI v2.0 (Google Gemini)"
  },
  "metadata": {
    "analysis_version": "2.0",
    "timestamp": "2026-02-18T10:30:00.000Z",
    "detection_layers": ["ai", "heuristic"]
  }
}
```

### Example 2: Suspicious Email

**Request:**

```json
{
  "text": "Dear valued customer, please update your payment information to avoid service interruption."
}
```

**Response:**

```json
{
  "risk_score": 55,
  "risk_level": "SUSPICIOUS",
  "flags": [
    "Impersonation indicators detected: dear customer, valued customer",
    "Payment indicators detected: payment information"
  ],
  "ai_analysis": {
    "enabled": true,
    "confidence": 0.78,
    "model": "PhishGuard AI v2.0 (Google Gemini)"
  },
  "metadata": {
    "analysis_version": "2.0",
    "timestamp": "2026-02-18T10:30:00.000Z",
    "detection_layers": ["ai", "heuristic"]
  }
}
```

### Example 3: High Risk Phishing

**Request:**

```json
{
  "text": "URGENT!!! Your account WILL BE SUSPENDED in 24 hours! Verify immediately: http://192.168.1.1/verify?user=admin&pass=reset. Enter your SSN and password NOW!!!"
}
```

**Response:**

```json
{
  "risk_score": 95,
  "risk_level": "HIGH_RISK",
  "flags": [
    "Urgency indicators detected: urgent, suspended, immediately",
    "Threats indicators detected: will be suspended",
    "Suspicious IP-based URL: http://192.168.1.1/verify",
    "URL contains embedded credentials",
    "Excessive exclamation marks (6)",
    "Multiple all-caps words (4)",
    "Requests sensitive information: social security",
    "AI Analysis (98% confidence): Impersonation, Urgency tactics, Credential theft attempt"
  ],
  "ai_analysis": {
    "enabled": true,
    "confidence": 0.98,
    "model": "PhishGuard AI v2.0 (Google Gemini)"
  },
  "metadata": {
    "analysis_version": "2.0",
    "timestamp": "2026-02-18T10:30:00.000Z",
    "detection_layers": ["ai", "heuristic"]
  }
}
```

---

## Client Libraries

### JavaScript/Node.js

```javascript
async function analyzeEmail(emailText) {
  const response = await fetch("http://localhost:5000/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: emailText }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// Usage
const result = await analyzeEmail("Email content here...");
console.log(`Risk Level: ${result.risk_level}`);
```

### Python

```python
import requests

def analyze_email(email_text):
    response = requests.post(
        'http://localhost:5000/analyze',
        json={'text': email_text}
    )
    response.raise_for_status()
    return response.json()

# Usage
result = analyze_email('Email content here...')
print(f"Risk Level: {result['risk_level']}")
```

### cURL

```bash
# Analyze email
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Email content here..."}'

# Health check
curl http://localhost:5000/health
```

---

## Versioning

API version is included in all responses via the `metadata.analysis_version` field.

Current version: **2.0**

---

## Support

For API support:

- GitHub Issues: https://github.com/yourusername/phishguard/issues
- Email: support@example.com

---

**Last Updated**: February 18, 2026
