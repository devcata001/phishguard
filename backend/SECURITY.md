# PhishGuard Backend - Security Documentation

## Security Features Implemented

### 1. Input Validation & Sanitization

- **Type validation**: Ensures all inputs are correct types
- **Length limits**: Max 100KB email content (configurable)
- **Null byte detection**: Prevents injection attacks
- **Content sanitization**: Strips dangerous characters

### 2. Rate Limiting

- **Default**: 30 requests per 60-second window per IP
- **IP tracking**: Supports X-Forwarded-For for proxy environments
- **Automatic cleanup**: Old entries are periodically removed
- **429 responses**: Standard rate limit exceeded responses

### 3. Security Headers

Applied to all responses:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'none'
Referrer-Policy: no-referrer
```

### 4. Request Size Limits

- **Max request size**: 1MB (configurable)
- **413 responses**: Request too large with helpful message
- **Prevents**: Memory exhaustion attacks

### 5. CORS Configuration

- **Restricted origins**: Configurable allowlist
- **Method limiting**: Only GET and POST allowed
- **Header restrictions**: Limited to Content-Type

### 6. Error Handling

- **No information leakage**: Generic error messages to clients
- **Detailed logging**: Full errors logged server-side
- **Graceful degradation**: Handles unexpected errors

### 7. Logging & Monitoring

- **Structured logging**: Timestamp, level, context
- **Security events**: Rate limits, validation failures
- **Performance metrics**: Analysis time tracking
- **IP logging**: Client IP for audit trails

## Advanced Detection Features

### Multi-Layer Analysis

1. **Keyword/Pattern Analysis**:

   - 50+ phishing patterns with regex support
   - Context-aware false positive reduction
   - Severity-based scoring (high/medium/low)

2. **URL Analysis**:

   - Homograph attack detection
   - Typosquatting detection for 15+ trusted brands
   - URL shortener identification
   - IP address hostname detection
   - Punycode/IDN detection
   - Parameter analysis for redirects
   - TLD risk assessment

3. **Behavioral Analysis**:

   - Urgency tactics detection
   - Emotional manipulation (excessive punctuation)
   - Personal information requests
   - All-caps aggressive language
   - Financial amount + urgency correlation

4. **Anomaly Detection**:
   - Hidden zero-width characters
   - Mixed script detection (Cyrillic lookalikes)
   - Excessive special characters
   - Unusual spacing patterns

### Risk Scoring

- **SAFE**: Score < 25
- **SUSPICIOUS**: Score 25-59
- **HIGH_RISK**: Score ≥ 60

Scores are cumulative across all detection layers.

## Production Deployment Checklist

### Pre-Deployment

- [ ] Set `FLASK_ENV=production`
- [ ] Set `FLASK_DEBUG=0`
- [ ] Configure `ALLOWED_ORIGINS` for your frontend domain
- [ ] Set appropriate `RATE_LIMIT` for your traffic
- [ ] Configure `LOG_LEVEL=WARNING` or `ERROR`
- [ ] Review and adjust `MAX_TEXT_LENGTH` if needed

### Infrastructure

- [ ] Use WSGI server (gunicorn, uWSGI) - **DO NOT use Flask dev server**
- [ ] Enable HTTPS/TLS - **REQUIRED for production**
- [ ] Set up reverse proxy (nginx, Apache)
- [ ] Implement distributed rate limiting (Redis)
- [ ] Set up log aggregation (ELK, Splunk, CloudWatch)
- [ ] Configure monitoring & alerts

### Recommended Deployment Command

```bash
# Install production server
pip install gunicorn

# Run with gunicorn (4 workers)
gunicorn -w 4 -b 0.0.0.0:5000 --access-logfile - --error-logfile - app:create_app()
```

### Environment Variables (Production)

```bash
export FLASK_ENV=production
export FLASK_DEBUG=0
export HOST=0.0.0.0
export PORT=5000
export LOG_LEVEL=WARNING
export ALLOWED_ORIGINS=https://yourdomain.com
export RATE_LIMIT=100
export RATE_LIMIT_WINDOW=60
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

ENV FLASK_ENV=production
ENV FLASK_DEBUG=0

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:create_app()"]
```

## Security Best Practices

### 1. Database (If Added)

- Use parameterized queries (prevent SQL injection)
- Encrypt sensitive data at rest
- Implement proper access controls
- Regular backups with encryption

### 2. Authentication (If Added)

- Use JWT with short expiration
- Implement refresh tokens
- Rate limit authentication endpoints
- Use bcrypt/argon2 for password hashing

### 3. API Keys (If Added)

- Generate cryptographically secure keys
- Rotate keys regularly
- Rate limit by API key
- Log all key usage

### 4. Network Security

- Use TLS 1.3 only
- Implement firewall rules
- DDoS protection (Cloudflare, AWS Shield)
- Regular security scans

### 5. Monitoring

- Failed request rate alerts
- Rate limit breach alerts
- Error rate alerts
- Response time anomalies
- Unusual traffic patterns

## Threat Model

### Threats Mitigated

✅ **Input injection**: Type and content validation  
✅ **DoS attacks**: Rate limiting, request size limits  
✅ **Information disclosure**: Generic errors, header removal  
✅ **XSS**: Security headers  
✅ **CSRF**: CORS restrictions  
✅ **Buffer overflow**: Length limits

### Residual Risks

⚠ **Advanced persistent threats**: Requires additional measures  
⚠ **Zero-day exploits**: Keep dependencies updated  
⚠ **Social engineering**: User education needed  
⚠ **Account enumeration**: If authentication added

## Compliance Considerations

### GDPR (if processing EU data)

- No PII is stored (stateless design ✅)
- IP logging should be anonymized for long-term storage
- Provide privacy policy
- Data processing agreement if needed

### SOC 2 / ISO 27001

- Document security controls (this file)
- Implement access logging
- Regular security audits
- Incident response plan

## Incident Response

### If Breach Detected

1. **Isolate**: Take service offline if critical
2. **Investigate**: Check logs for attack vectors
3. **Patch**: Fix vulnerability immediately
4. **Notify**: Inform affected parties if required
5. **Document**: Post-mortem analysis
6. **Improve**: Update security controls

### Contact

Security issues: [your-security-email@domain.com]

## Version History

- v2.0.0 (2026-01-01): Security-hardened production release
- v1.0.0: Initial release
