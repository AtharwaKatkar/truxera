"""
services/moderation.py
Anti-fake-review and content moderation logic.
"""
import re
from datetime import datetime, timedelta

# ── PROFANITY (minimal seed list — extend as needed) ──────
_PROFANITY = {"fuck","shit","bastard","asshole","bitch","cunt","dick","pussy"}

# ── SPAM PATTERNS ─────────────────────────────────────────
_SPAM_PATTERNS = [
    r"\b(click here|buy now|visit us|call now|whatsapp)\b",
    r"(http|https)://\S+",          # URLs in review text
    r"\b(\w)\1{4,}\b",              # aaaaa / kkkkk
    r"(.)\1{6,}",                   # repeated chars
]

MIN_REVIEW_LENGTH = 20   # chars
MAX_REVIEW_LENGTH = 2000
DUPLICATE_WINDOW_HOURS = 24


def validate_review_text(text: str) -> tuple[bool, str]:
    """Returns (is_valid, error_message)."""
    t = text.strip()
    if len(t) < MIN_REVIEW_LENGTH:
        return False, f"Review must be at least {MIN_REVIEW_LENGTH} characters."
    if len(t) > MAX_REVIEW_LENGTH:
        return False, f"Review must be under {MAX_REVIEW_LENGTH} characters."
    words = set(t.lower().split())
    if words & _PROFANITY:
        return False, "Review contains inappropriate language."
    for pat in _SPAM_PATTERNS:
        if re.search(pat, t, re.I):
            return False, "Review appears to contain spam content."
    return True, ""


def spam_score(text: str, rating: int, reviewer_ip: str | None,
               recent_reviews_from_ip: int) -> int:
    """
    Returns a spam score 0–100.
    > 60 → flag for moderation, > 80 → auto-reject.
    """
    score = 0
    t = text.lower()

    # Very short text
    if len(t) < 30: score += 20

    # All caps
    if text == text.upper() and len(text) > 10: score += 15

    # Repeated chars
    if re.search(r"(.)\1{5,}", text): score += 20

    # Extreme rating with very short text (fake positive/negative flood)
    if rating in (1, 5) and len(t) < 40: score += 15

    # Same IP submitted multiple reviews recently
    if recent_reviews_from_ip >= 3: score += 30
    elif recent_reviews_from_ip >= 2: score += 15

    return min(score, 100)


def auto_status(spam: int) -> str:
    if spam >= 80: return "rejected"
    if spam >= 50: return "flagged"
    return "pending"
