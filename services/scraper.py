"""
services/scraper.py
────────────────────────────────────────────────────────────
Lightweight web scraper for Truxera trust scoring.

Rules:
  - Only fetches the homepage (no crawling)
  - Hard timeout: 5 seconds
  - Content capped at 50 KB to stay fast
  - Used as a supporting signal only (10–15% weight)
  - Never raises — always returns a safe fallback dict
"""

import re
import asyncio
import logging
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("truxera.scraper")

# ── CONSTANTS ────────────────────────────────────────────────────────────────

TIMEOUT        = 5          # seconds
MAX_BYTES      = 50_000     # 50 KB cap — fast, avoids huge pages
MAX_TEXT_CHARS = 3_000      # chars of visible text we keep

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Keywords that raise suspicion — weighted by severity
SUSPICIOUS_KEYWORDS: dict[str, int] = {
    # High severity (2 pts each)
    "free money":       2,
    "win now":          2,
    "you have won":     2,
    "claim your prize": 2,
    "100% guaranteed":  2,
    "risk free":        2,
    "no investment":    2,
    "work from home earn":  2,
    # Medium severity (1 pt each)
    "urgent":           1,
    "limited offer":    1,
    "act now":          1,
    "expires today":    1,
    "only today":       1,
    "instant approval": 1,
    "guaranteed income":1,
    "double your money":1,
    "easy money":       1,
    "make money fast":  1,
    "no experience needed": 1,
    "government approved":  1,
    "rbi approved":     1,
    "sebi approved":    1,
}

# Pages we look for in nav links / footer links
TRUST_PAGES = {
    "contact":  ["contact", "contact-us", "contactus", "reach-us", "support"],
    "about":    ["about", "about-us", "aboutus", "who-we-are", "company"],
    "privacy":  ["privacy", "privacy-policy", "privacypolicy"],
    "refund":   ["refund", "return", "cancellation", "money-back"],
    "terms":    ["terms", "terms-of-service", "tos", "terms-and-conditions"],
}

# ── MAIN FUNCTION ────────────────────────────────────────────────────────────

def analyze_website_content(url: str) -> dict:
    """
    Scrape the homepage of `url` and return a structured signal dict.

    Returns a safe fallback dict on any error — never raises.

    Return shape:
    {
        "title":               str,
        "meta_description":    str,
        "has_contact_page":    bool,
        "has_about_page":      bool,
        "has_privacy_page":    bool,
        "has_refund_page":     bool,
        "has_terms_page":      bool,
        "external_links_count": int,
        "internal_links_count": int,
        "suspicious_score":    int,   # 0–10+
        "suspicious_keywords": list[str],
        "content_length":      int,   # visible text chars
        "scrape_success":      bool,
        "error":               str | None,
    }
    """
    fallback = _empty_result(url)

    # ── 1. Validate URL ──────────────────────────────────────────────────────
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        if not parsed.netloc:
            fallback["error"] = "Invalid URL"
            return fallback
        base_domain = parsed.netloc.lower()
        fetch_url   = parsed.geturl()
    except Exception as exc:
        fallback["error"] = f"URL parse error: {exc}"
        return fallback

    # ── 2. Fetch homepage ────────────────────────────────────────────────────
    try:
        resp = requests.get(
            fetch_url,
            headers=HEADERS,
            timeout=TIMEOUT,
            allow_redirects=True,
            stream=True,                    # stream so we can cap bytes
            verify=False,                   # some scam sites have bad certs
        )
        resp.raise_for_status()

        # read up to MAX_BYTES only
        raw_html = b""
        for chunk in resp.iter_content(chunk_size=8192):
            raw_html += chunk
            if len(raw_html) >= MAX_BYTES:
                break

        html = raw_html.decode("utf-8", errors="replace")

    except requests.exceptions.Timeout:
        fallback["error"] = "Timeout — site took > 5s to respond"
        return fallback
    except requests.exceptions.ConnectionError:
        fallback["error"] = "Connection refused or DNS failed"
        return fallback
    except requests.exceptions.TooManyRedirects:
        fallback["error"] = "Too many redirects"
        return fallback
    except requests.exceptions.HTTPError as exc:
        fallback["error"] = f"HTTP {exc.response.status_code}"
        return fallback
    except Exception as exc:
        fallback["error"] = f"Fetch error: {exc}"
        return fallback

    # ── 3. Parse HTML ────────────────────────────────────────────────────────
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    result = _empty_result(url)
    result["scrape_success"] = True

    # ── 4. Title ─────────────────────────────────────────────────────────────
    title_tag = soup.find("title")
    result["title"] = title_tag.get_text(strip=True)[:200] if title_tag else ""

    # ── 5. Meta description ──────────────────────────────────────────────────
    meta = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    if meta:
        result["meta_description"] = (meta.get("content") or "")[:300]

    # ── 6. Visible text ──────────────────────────────────────────────────────
    for tag in soup(["script", "style", "noscript", "svg", "img"]):
        tag.decompose()
    visible_text = " ".join(soup.get_text(separator=" ").split())
    result["content_length"] = len(visible_text)
    text_sample = visible_text[:MAX_TEXT_CHARS].lower()

    # ── 7. Suspicious keywords ───────────────────────────────────────────────
    found_keywords = []
    sus_score = 0
    for kw, weight in SUSPICIOUS_KEYWORDS.items():
        if kw in text_sample:
            found_keywords.append(kw)
            sus_score += weight
    result["suspicious_keywords"] = found_keywords
    result["suspicious_score"]    = min(sus_score, 15)   # cap at 15

    # ── 8. Links analysis ────────────────────────────────────────────────────
    all_links = soup.find_all("a", href=True)
    ext_count = 0
    int_count = 0
    all_hrefs = []

    for a in all_links:
        href = a["href"].strip().lower()
        if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
            continue
        abs_href = urljoin(fetch_url, href)
        all_hrefs.append(abs_href)
        link_domain = urlparse(abs_href).netloc.lower()
        if link_domain and link_domain != base_domain:
            ext_count += 1
        else:
            int_count += 1

    result["external_links_count"] = ext_count
    result["internal_links_count"] = int_count

    # ── 9. Trust pages detection ─────────────────────────────────────────────
    # Check both href paths and anchor text
    anchor_texts = [a.get_text(strip=True).lower() for a in all_links]
    combined     = " ".join(all_hrefs + anchor_texts).lower()

    for page_key, patterns in TRUST_PAGES.items():
        result[f"has_{page_key}_page"] = any(p in combined for p in patterns)

    logger.info("Scraped %s — sus=%d content=%d",
                base_domain, result["suspicious_score"], result["content_length"])
    return result


# ── ASYNC WRAPPER ─────────────────────────────────────────────────────────────

async def analyze_website_content_async(url: str) -> dict:
    """
    Async wrapper — runs the blocking scraper in a thread pool
    so it doesn't block FastAPI's event loop.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, analyze_website_content, url)


# ── TRUST SCORE PENALTY ───────────────────────────────────────────────────────

def scrape_penalty(scrape: dict) -> int:
    """
    Convert scrape signals into a penalty (0–15 points deducted).
    Weight: ~10–15% of total trust score.

    Penalties:
      - No contact page          : -4
      - No about page            : -3
      - No privacy page          : -2
      - Suspicious keywords      : up to -8  (proportional)
      - Very thin content (<200) : -4
      - Thin content (<800)      : -2
    """
    if not scrape.get("scrape_success"):
        return 0   # can't penalise what we couldn't fetch

    penalty = 0

    if not scrape.get("has_contact_page"):  penalty += 4
    if not scrape.get("has_about_page"):    penalty += 3
    if not scrape.get("has_privacy_page"):  penalty += 2

    sus = scrape.get("suspicious_score", 0)
    if sus >= 8:   penalty += 8
    elif sus >= 4: penalty += 5
    elif sus >= 2: penalty += 3
    elif sus >= 1: penalty += 1

    length = scrape.get("content_length", 0)
    if length < 200:   penalty += 4
    elif length < 800: penalty += 2

    return min(penalty, 15)   # hard cap at 15


# ── HELPERS ───────────────────────────────────────────────────────────────────

def _empty_result(url: str) -> dict:
    return {
        "url":                  url,
        "title":                "",
        "meta_description":     "",
        "has_contact_page":     False,
        "has_about_page":       False,
        "has_privacy_page":     False,
        "has_refund_page":      False,
        "has_terms_page":       False,
        "external_links_count": 0,
        "internal_links_count": 0,
        "suspicious_score":     0,
        "suspicious_keywords":  [],
        "content_length":       0,
        "scrape_success":       False,
        "error":                None,
    }
