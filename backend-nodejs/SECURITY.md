# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in PhishGuard Backend, please report it privately to avoid public disclosure that could put users at risk.

**Please DO NOT:**

- Open a public GitHub issue
- Post about it on social media
- Disclose it to others before we've had a chance to address it

**Please DO:**

- Email security report to: security@example.com
- Include detailed steps to reproduce the issue
- Provide POC code if applicable
- Allow reasonable time for us to address the issue before public disclosure

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Security Features

This application implements multiple layers of security:

### Input Validation

- Schema-based validation using Joi
- String sanitization to prevent injection
- Maximum input length enforcement
- Null byte detection
- Type checking

### Rate Limiting

- IP-based rate limiting
- Configurable thresholds
- Automatic blocking of abusive clients
- Graceful error responses

### Authentication & Authorization

- API key validation (for AI service)
- Environment-based secrets management
- No hardcoded credentials

### Network Security

- CORS protection with whitelist
- Security headers via Helmet.js
- HTTPS enforcement (recommended in production)
- Request size limits

### Error Handling

- No stack traces in production
- Generic error messages to prevent information leakage
- Structured logging without PII
- Safe error responses

### Docker Security

- Non-root user execution
- Minimal base image (Alpine)
- Security updates included
- No unnecessary packages

## Best Practices

### For Deployment

1. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management in production
   - Rotate API keys regularly

2. **HTTPS**
   - Always use HTTPS in production
   - Enable HSTS headers
   - Use valid SSL certificates

3. **Updates**
   - Keep dependencies updated
   - Run `npm audit` regularly
   - Monitor security advisories

4. **Monitoring**
   - Review logs for suspicious activity
   - Set up alerts for rate limit violations
   - Monitor API usage patterns

5. **Access Control**
   - Limit network access to API
   - Use firewall rules
   - Implement IP whitelisting if needed

### For Development

1. **Never commit secrets** to version control
2. **Run security audits** before deployment
3. **Use environment variables** for all configuration
4. **Test security features** in staging environment
5. **Review code** for security vulnerabilities

## Known Security Considerations

1. **Rate Limiting**: Current implementation uses in-memory store. For production at scale, consider Redis-based rate limiting.

2. **AI API Key**: Gemini API key should be kept secure. Consider using a secure vault service in production.

3. **CORS**: Update `ALLOWED_ORIGINS` to include only trusted domains in production.

4. **Logging**: Email content is not logged to prevent PII leakage. Maintain this policy.

## Vulnerability Response

When a vulnerability is reported:

1. **Acknowledgment**: Within 48 hours
2. **Initial Assessment**: Within 1 week
3. **Fix Development**: Based on severity
4. **Testing**: Thorough security testing
5. **Deployment**: Coordinated release
6. **Disclosure**: After fix is deployed

## Security Checklist for Production

- [ ] HTTPS enabled
- [ ] Environment variables configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Logging configured (no PII)
- [ ] Error handling tested
- [ ] Dependencies updated
- [ ] Security audit completed
- [ ] Secrets stored securely
- [ ] Monitoring configured

## Contact

For security-related inquiries:

- Email: security@example.com
- Response time: Within 48 hours

---

**Last Updated**: February 18, 2026
