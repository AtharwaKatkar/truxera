"""
services/score_explainer.py
────────────────────────────────────────────────────────────
Generates human-readable score explanations.

Returns:
  - summary:       "This score is based on 4 verified factors"
  - positive:      list of positive signals
  - negative:      list of risk signals
  - section_title: dynamic title for the reasons section
  - verdict:       one-line verdict for the result card header
"""

from typing import Optional


def build_explanation(
    trust_score: int,
    trust_level: str,
    analysis_type: str,
    verified_checks: dict,
    reasons: list[str],
    n_reports: int,
    n_reviews: int,
    avg_rating: Optional[float],
    data_availability: dict,
) -> dict:
    """
    Build a structured explanation of the trust score.
    Only uses real data — never fabricates.
    """

    # ── Count real signals ────────────────────────────────
    signal_count = sum([
        data_availability.get("whois", False),
        data_availability.get("safe_browsing", False),
        data_availability.get("scrape", False),
        data_availability.get("technical_checks", False),
        data_availability.get("community_reports", False),
        data_availability.get("reviews", False),
    ])

    # ── Positive signals ──────────────────────────────────
    positive = []
    vc = verified_checks

    if vc.get("ssl_valid"):
        expiry = vc.get("ssl_expiry_days")
        if expiry and expiry > 30:
            positive.append({"icon": "🔐", "text": f"Valid SSL certificate ({expiry} days remaining)"})
        else:
            positive.append({"icon": "🔐", "text": "Valid SSL certificate"})

    if vc.get("redirects_to_https"):
        positive.append({"icon": "↪️", "text": "HTTP traffic redirected to HTTPS"})

    if vc.get("dns_resolves"):
        positive.append({"icon": "🌐", "text": "Domain resolves correctly"})

    if vc.get("google_safe_browsing_checked") and not vc.get("google_safe_browsing_flagged"):
        positive.append({"icon": "✅", "text": "Not flagged by Google Safe Browsing"})

    age = vc.get("domain_age_days")
    if age is not None and age >= 365:
        years = round(age / 365, 1)
        positive.append({"icon": "🗓", "text": f"Established domain — {years} year{'s' if years != 1 else ''} old"})

    if vc.get("has_contact_page"):
        positive.append({"icon": "📞", "text": "Contact page found"})

    if vc.get("has_about_page"):
        positive.append({"icon": "ℹ️", "text": "About/company page found"})

    if vc.get("has_privacy_page"):
        positive.append({"icon": "🔒", "text": "Privacy policy found"})

    if avg_rating is not None and avg_rating >= 4.0 and n_reviews >= 3:
        positive.append({"icon": "⭐", "text": f"High community rating — {avg_rating}/5 from {n_reviews} reviews"})

    # ── Risk signals (from reasons list) ─────────────────
    negative = []
    for r in reasons:
        icon = _classify_reason_icon(r)
        negative.append({"icon": icon, "text": r})

    # ── Summary sentence ──────────────────────────────────
    if signal_count == 0:
        summary = "No verified data available yet"
    elif signal_count == 1:
        summary = "Based on 1 verified check — limited confidence"
    else:
        summary = f"Based on {signal_count} verified factor{'s' if signal_count != 1 else ''}"

    if n_reports > 0:
        summary += f" · {n_reports} community report{'s' if n_reports != 1 else ''}"
    if n_reviews >= 3:
        summary += f" · {n_reviews} user review{'s' if n_reviews != 1 else ''}"

    # ── Dynamic section title ─────────────────────────────
    if trust_score >= 80 and not negative:
        section_title = "No risk signals detected"
    elif trust_score >= 80 and negative:
        section_title = "Minor concerns"
    elif trust_score >= 60:
        section_title = "Some concerns found"
    elif trust_score >= 40:
        section_title = "Risk signals detected"
    elif trust_score >= 20:
        section_title = "Multiple risk signals"
    else:
        section_title = "High risk — proceed with caution"

    # ── One-line verdict ──────────────────────────────────
    if analysis_type in ("no_data", "limited_technical"):
        verdict = "Insufficient data for a full assessment"
    elif analysis_type == "preliminary_technical":
        verdict = "Preliminary analysis — no community data yet"
    elif trust_score >= 80:
        verdict = "Appears safe based on available data"
    elif trust_score >= 60:
        verdict = "Some concerns — review carefully before trusting"
    elif trust_score >= 40:
        verdict = "Significant risk signals detected"
    elif trust_score >= 20:
        verdict = "High risk — exercise extreme caution"
    else:
        verdict = "Very high risk — do not trust without verification"

    return {
        "summary":       summary,
        "positive":      positive,
        "negative":      negative,
        "section_title": section_title,
        "verdict":       verdict,
        "signal_count":  signal_count,
        "has_community": n_reports > 0 or n_reviews >= 3,
    }


def _classify_reason_icon(text: str) -> str:
    t = text.lower()
    if "days old" in t or "year old" in t or "month" in t: return "🗓"
    if "blacklist" in t or "google" in t or "threat" in t:  return "🚫"
    if "report" in t:    return "📋"
    if "contact" in t:   return "📞"
    if "privacy" in t or "whois" in t: return "🔒"
    if "content" in t or "about" in t: return "📄"
    if "phrase" in t or "suspicious" in t: return "⚠️"
    if "rating" in t:    return "⭐"
    if "ssl" in t or "certificate" in t: return "🔐"
    if "dns" in t:       return "🌐"
    if "https" in t or "redirect" in t: return "↪️"
    if "slow" in t or "response" in t:  return "⚡"
    if "header" in t:    return "🛡️"
    return "🔴"
