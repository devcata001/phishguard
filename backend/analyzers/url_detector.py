"""
Advanced URL and Domain Analysis for Phishing Detection

Implements sophisticated URL analysis including:
- Domain reputation heuristics
- Homograph and typosquatting detection
- URL obfuscation techniques
- Subdomain abuse patterns
- TLD risk assessment
- Protocol security validation
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass
from urllib.parse import urlparse, parse_qs
from typing import Optional

logger = logging.getLogger(__name__)

# Enhanced URL extraction regex
URL_REGEX = re.compile(
    r"""
    (?P<url>
        (?:https?://|ftp://|www\.)          # Protocol or www
        (?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+  # Domain
        [a-zA-Z]{2,}                         # TLD
        (?:[/?#][^\s<>"'\)]*)?              # Path/query/fragment
    )
    """,
    flags=re.IGNORECASE | re.VERBOSE
)

# Known URL shortener services
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "rebrand.ly", "短.co", "tiny.cc", "lnkd.in",
    "bitly.com", "short.io", "s.id", "cli.gs", "v.gd",
}

# High-risk TLDs (frequently abused in phishing)
HIGH_RISK_TLDS = {
    "zip", "mov", "top", "xyz", "click", "country", "stream",
    "gq", "tk", "ml", "ga", "cf", "work", "party", "download",
    "loan", "racing", "cricket", "science", "accountant",
}

# Suspicious TLDs (medium risk)
SUSPICIOUS_TLDS = {
    "info", "biz", "online", "site", "club", "win", "bid",
    "trade", "webcam", "date", "faith", "review",
}

# Trusted brand domains for typosquatting detection
TRUSTED_BRANDS = {
    "google", "amazon", "microsoft", "apple", "facebook",
    "paypal", "netflix", "instagram", "twitter", "linkedin",
    "yahoo", "ebay", "dropbox", "adobe", "salesforce",
    "bank", "chase", "wellsfargo", "citibank", "usbank",
}


@dataclass(frozen=True)
class UrlAnalysis:
    """Detailed URL analysis result."""
    url: str
    risk_score: int
    findings: list[str]
    is_suspicious: bool


def extract_urls(text: str) -> list[str]:
    """
    Extract and normalize URLs from text.
    
    Returns deduplicated list of URLs.
    """
    if not text or not text.strip():
        return []
    
    urls: list[str] = []
    seen: set[str] = set()
    
    for match in URL_REGEX.finditer(text):
        raw_url = match.group("url")
        
        # Normalize www URLs
        if raw_url.lower().startswith("www."):
            raw_url = "http://" + raw_url
        
        # Deduplicate
        if raw_url not in seen:
            seen.add(raw_url)
            urls.append(raw_url)
    
    return urls


def _is_ip_address(hostname: str) -> bool:
    """Check if hostname is an IP address (IPv4 or IPv6)."""
    # IPv4 check
    ipv4_pattern = r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    if re.match(ipv4_pattern, hostname):
        return True
    
    # IPv6 check (simplified)
    if ":" in hostname and re.match(r"^[0-9a-fA-F:]+$", hostname):
        return True
    
    return False


def _detect_homograph_attack(domain: str) -> bool:
    """
    Detect homograph/lookalike characters.
    
    Phishers use similar-looking characters from different alphabets.
    """
    # Common Cyrillic lookalikes for Latin letters
    cyrillic_lookalikes = {
        'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c',
        'у': 'y', 'х': 'x', 'і': 'i', 'ѕ': 's', 'һ': 'h',
    }
    
    return any(char in domain for char in cyrillic_lookalikes.keys())


def _detect_typosquatting(domain: str) -> Optional[str]:
    """
    Detect potential typosquatting of trusted brands.
    
    Returns the trusted brand name if typosquatting detected.
    """
    domain_lower = domain.lower()
    
    for brand in TRUSTED_BRANDS:
        # Check for brand name variations
        if brand in domain_lower and brand != domain_lower:
            # Common typosquatting patterns
            suspicious_patterns = [
                brand + "-",
                brand + "secure",
                brand + "verify",
                brand + "login",
                brand + "account",
                "secure" + brand,
                "verify" + brand,
                brand.replace('o', '0'),  # Letter to number substitution
                brand.replace('i', '1'),
                brand.replace('l', '1'),
            ]
            
            if any(pattern in domain_lower for pattern in suspicious_patterns):
                return brand
    
    return None


def _analyze_url_parameters(url: str) -> tuple[int, list[str]]:
    """Analyze URL parameters for suspicious patterns."""
    score = 0
    findings = []
    
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        
        # Suspicious parameter names
        suspicious_params = ['redirect', 'url', 'goto', 'link', 'next', 'return']
        for param in suspicious_params:
            if param in params:
                score += 8
                findings.append(f"Suspicious redirect parameter '{param}' in URL")
                break
        
        # Too many parameters (obfuscation)
        if len(params) > 10:
            score += 6
            findings.append("Excessive URL parameters - possible obfuscation")
        
        # Check for encoded URLs in parameters (redirect chains)
        for values in params.values():
            for value in values:
                if 'http' in str(value).lower():
                    score += 12
                    findings.append("URL contains embedded redirect URL")
                    break
    
    except Exception as e:
        logger.debug(f"Error parsing URL parameters: {e}")
    
    return score, findings


def _analyze_single_url(url: str) -> UrlAnalysis:
    """
    Perform comprehensive analysis on a single URL.
    
    Returns UrlAnalysis with risk score and findings.
    """
    score = 0
    findings = []
    
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower().strip(".")
        
        if not hostname:
            return UrlAnalysis(url, 0, ["Invalid URL"], False)
        
        # 1. URL Shortener Detection (HIGH RISK)
        if hostname in SHORTENER_DOMAINS:
            score += 22
            findings.append(f"🔗 URL shortener detected ({hostname}) - hides true destination")
        
        # 2. IP Address as Host (HIGH RISK)
        if _is_ip_address(hostname):
            score += 28
            findings.append(f"🚨 IP address used as hostname - highly suspicious")
        
        # 3. Punycode/IDN Detection (HIGH RISK)
        if hostname.startswith("xn--") or "xn--" in hostname:
            score += 26
            findings.append(f"⚠ Punycode domain detected - possible homograph attack")
        
        # 4. Homograph Attack Detection
        if _detect_homograph_attack(hostname):
            score += 24
            findings.append("🎭 Lookalike characters detected - homograph attack")
        
        # 5. Typosquatting Detection
        typosquatted_brand = _detect_typosquatting(hostname)
        if typosquatted_brand:
            score += 30
            findings.append(f"🎯 Typosquatting detected - mimicking '{typosquatted_brand}'")
        
        # 6. Subdomain Analysis
        labels = hostname.split(".")
        if len(labels) >= 5:
            score += 14
            findings.append(f"📍 Deep subdomain structure ({len(labels)} levels) - suspicious")
        elif len(labels) >= 4:
            score += 8
            findings.append(f"📍 Multiple subdomains detected - verify legitimacy")
        
        # 7. TLD Risk Assessment
        if labels:
            tld = labels[-1]
            if tld in HIGH_RISK_TLDS:
                score += 18
                findings.append(f"⚠ High-risk TLD '.{tld}' - frequently abused")
            elif tld in SUSPICIOUS_TLDS:
                score += 10
                findings.append(f"⚠ Suspicious TLD '.{tld}' - verify source")
        
        # 8. Protocol Security
        if parsed.scheme.lower() == "http":
            score += 8
            findings.append("🔓 Unencrypted HTTP connection - no TLS/SSL")
        elif parsed.scheme.lower() == "ftp":
            score += 12
            findings.append("🔓 FTP protocol detected - insecure file transfer")
        
        # 9. Suspicious Characters in Domain
        if re.search(r'[^a-z0-9\-.]', hostname):
            score += 10
            findings.append("⚠ Unusual characters in domain name")
        
        # 10. Port Number Check
        if parsed.port and parsed.port not in [80, 443, 8080]:
            score += 10
            findings.append(f"🔌 Non-standard port {parsed.port} - unusual")
        
        # 11. URL Parameter Analysis
        param_score, param_findings = _analyze_url_parameters(url)
        score += param_score
        findings.extend(param_findings)
        
        # 12. Excessive Path Length (obfuscation)
        if len(parsed.path) > 200:
            score += 7
            findings.append("📏 Unusually long URL path - possible obfuscation")
        
        # 13. Authentication in URL (security risk)
        if parsed.username or parsed.password:
            score += 15
            findings.append("🔑 Credentials embedded in URL - security violation")
        
        is_suspicious = score >= 15
        
        return UrlAnalysis(url, score, findings, is_suspicious)
    
    except Exception as e:
        logger.error(f"Error analyzing URL {url}: {e}")
        return UrlAnalysis(url, 5, [f"Error analyzing URL: {str(e)}"], False)


def analyze_urls(text: str) -> tuple[int, list[str]]:
    """
    Extract and analyze all URLs in email text.
    
    Returns:
        Tuple of (total_risk_score, list_of_detailed_findings)
    """
    urls = extract_urls(text)
    
    if not urls:
        return 0, []
    
    total_score = 0
    all_findings = []
    
    # Add score for excessive links (spam/phishing pattern)
    if len(urls) >= 5:
        total_score += 15
        all_findings.append(f"🔗 High link density ({len(urls)} URLs) - spam pattern")
    elif len(urls) >= 3:
        total_score += 8
        all_findings.append(f"🔗 Multiple links detected ({len(urls)} URLs)")
    
    # Analyze each URL
    for url in urls[:10]:  # Limit analysis to first 10 URLs for performance
        analysis = _analyze_single_url(url)
        
        if analysis.findings:
            total_score += analysis.risk_score
            # Prepend URL to findings for context
            for finding in analysis.findings:
                all_findings.append(f"{finding} ({url[:60]}...)" if len(url) > 60 else f"{finding} ({url})")
    
    logger.info(f"URL analysis complete - {len(urls)} URLs analyzed, total score: {total_score}")
    
    return total_score, all_findings
