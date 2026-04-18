"""
services/domain_extractor.py
────────────────────────────────────────────────────────────
Extracts a domain from natural language input.

Handles:
  "is xyz.com safe?"          → xyz.com
  "check abc.in"              → abc.in
  "https://www.example.com"   → example.com
  "quickjobs247.in"           → quickjobs247.in
  "tell me about flipkart.com"→ flipkart.com

Never calls an external API — pure regex + heuristics.
"""

import re
from urllib.parse import urlparse

# Common TLDs to help identify bare domains in sentences
_TLD_PATTERN = (
    r"(?:com|in|co\.in|org|net|io|gov|edu|info|biz|co|app|ai|tech|"
    r"store|shop|online|site|web|xyz|club|live|news|media|finance|"
    r"money|loan|jobs|work|career|pay|bank|secure|safe|trust)"
)

# Regex: optional www., domain label, TLD
_DOMAIN_RE = re.compile(
    r"(?:https?://)?(?:www\.)?"
    r"([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*"
    r"\." + _TLD_PATTERN + r"(?:\.[a-z]{2})?)"
    r"(?:/[^\s]*)?",
    re.IGNORECASE,
)


def extract_domain(text: str) -> str | None:
    """
    Extract the most likely domain from any text input.
    Returns cleaned domain string or None if nothing found.
    """
    text = text.strip()
    if not text:
        return None

    # 1. If it looks like a URL, parse it directly
    if text.startswith(("http://", "https://")):
        try:
            parsed = urlparse(text)
            host = parsed.netloc.lower().replace("www.", "")
            if "." in host:
                return host.split("/")[0]
        except Exception:
            pass

    # 2. Regex scan for domain pattern
    matches = _DOMAIN_RE.findall(text)
    if matches:
        # Take the first match, clean it
        domain = matches[0].lower().strip().rstrip("/")
        domain = re.sub(r"^www\.", "", domain)
        return domain

    # 3. Last resort: if input has no spaces and contains a dot, treat as domain
    if " " not in text and "." in text:
        cleaned = text.lower().strip().replace("https://", "").replace("http://", "")
        cleaned = re.sub(r"^www\.", "", cleaned).rstrip("/").split("/")[0]
        if len(cleaned) > 3:
            return cleaned

    return None


def is_natural_language(text: str) -> bool:
    """Returns True if the input looks like a sentence rather than a bare domain."""
    words = text.strip().split()
    return len(words) > 1 or any(
        kw in text.lower()
        for kw in ["is ", "check ", "safe", "legit", "scam", "trust", "about ", "tell "]
    )
