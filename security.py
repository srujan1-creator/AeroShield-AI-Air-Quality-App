"""
AeroShield AI - Security & Sanitization Module
Implements multi-layer XSS defense, prompt-injection guard, length validation,
and sliding-window rate limiting.
"""

import html
import re
import time
from typing import Dict, Tuple, Optional, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

# Strict pattern for detecting prompt injection attempts
PROMPT_INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)",
    r"(?i)disregard\s+(all\s+)?(previous|prior|above)",
    r"(?i)you\s+are\s+now\s+(a|an|the)?\s*(unrestricted|jailbroken|dan|evil|root|developer)",
    r"(?i)act\s+as\s+(dan|jailbreak|unfiltered|system\s*admin)",
    r"(?i)system\s+override",
    r"(?i)print\s+(the\s+)?system\s+prompt",
    r"(?i)reveal\s+(the\s+)?(hidden|internal|system)\s+(instructions|prompt|rules)",
    r"(?i)bypass\s+safety\s+(filters|rules|checks|guidelines)",
    r"(?i)<\|im_start\|>",
    r"(?i)<\|im_end\|>",
    r"(?i)\[system\]",
    r"(?i)\[developer\]",
    r"(?i)output\s+the\s+preceding\s+text",
    r"(?i)simulate\s+unrestricted\s+mode",
]

# Compiled regex for efficiency
COMPILED_INJECTION_REGEX = [re.compile(p) for p in PROMPT_INJECTION_PATTERNS]

# XSS Blacklisted patterns and tags
XSS_PATTERNS = [
    r"(?i)<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>",
    r"(?i)<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>",
    r"(?i)<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>",
    r"(?i)<embed\b[^>]*>",
    r"(?i)<link\b[^>]*>",
    r"(?i)on\w+\s*=",  # e.g. onerror=, onload=, onclick=
    r"(?i)javascript:\s*",
    r"(?i)data:\s*text\/html",
    r"(?i)vbscript:\s*",
]
COMPILED_XSS_REGEX = [re.compile(p) for p in XSS_PATTERNS]


def sanitize_text(value: Any, max_length: int = 1000) -> str:
    """
    Sanitize general text input:
    1. Cast to string
    2. Enforce length constraints
    3. Neutralize XSS vectors
    4. HTML-entity escape characters (&, <, >, ", ')
    """
    if value is None:
        return ""
    text = str(value).strip()
    if len(text) > max_length:
        text = text[:max_length]
    
    # Check & strip malicious script and handler tags
    for pat in COMPILED_XSS_REGEX:
        text = pat.sub("", text)
    
    # Entity-escape the residual text to prevent DOM injection
    escaped = html.escape(text, quote=True)
    return escaped


def check_prompt_injection(text: str) -> Tuple[bool, Optional[str]]:
    """
    Inspect input text for adversarial prompt injection patterns.
    Returns (is_injected, matched_pattern).
    """
    if not text:
        return False, None
    
    for regex in COMPILED_INJECTION_REGEX:
        match = regex.search(text)
        if match:
            return True, match.group(0)
    
    # Check for excessive delimiter injection
    if text.count("```") > 4 or text.count('"""') > 2 or text.count("'''") > 2:
        return True, "excessive_delimiters"
        
    return False, None


class SlidingWindowRateLimiter:
    """
    Sliding window in-memory rate limiter per IP address.
    Default: 60 requests per 60 seconds window.
    """
    def __init__(self, limit: int = 60, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}

    def is_allowed(self, client_ip: str) -> Tuple[bool, int]:
        """
        Check if request is allowed.
        Returns (is_allowed, remaining_seconds_until_reset)
        """
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean up stale timestamps for client
        timestamps = self.requests.get(client_ip, [])
        valid_timestamps = [ts for ts in timestamps if ts > window_start]
        
        if len(valid_timestamps) >= self.limit:
            oldest = valid_timestamps[0]
            retry_after = max(1, int(self.window_seconds - (now - oldest)))
            self.requests[client_ip] = valid_timestamps
            return False, retry_after
        
        valid_timestamps.append(now)
        self.requests[client_ip] = valid_timestamps
        return True, 0

    def reset(self):
        """Reset rate limiter state (useful for tests)"""
        self.requests.clear()


# Global rate limiter instance
rate_limiter = SlidingWindowRateLimiter(limit=90, window_seconds=60)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware setting production-grade HTTP security headers:
    - Content-Security-Policy (CSP)
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy
    """
    async def dispatch(self, request: Request, call_next):
        # Client IP extraction with fallback
        client_ip = request.client.host if request.client else "127.0.0.1"
        
        # Check rate limiter for API endpoints
        if request.url.path.startswith("/api/"):
            allowed, retry_after = rate_limiter.is_allowed(client_ip)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "message": f"Rate limit exceeded. Please wait {retry_after}s before retrying.",
                        "retry_after": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        response: Response = await call_next(request)
        
        # Comprehensive Content Security Policy allowing Google Fonts and inline styles/scripts needed for local app
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://generativelanguage.googleapis.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        response.headers["Content-Security-Policy"] = csp
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        return response
