"""
services/trust_engine.py
Centralised trust score logic — single source of truth.
"""

def calc_score(
    domain_age_days: int | None,
    is_blacklisted: bool,
    n_reports: int,
    n_upvotes: int,
    is_whois_private: bool,
    scrape_pen: int = 0,
    avg_rating: float | None = None,
    n_reviews: int = 0,
) -> int:
    score = 100

    # Domain age
    if domain_age_days is not None:
        if domain_age_days < 90:    score -= 40
        elif domain_age_days < 180: score -= 20
        elif domain_age_days < 365: score -= 10

    # Blacklist
    if is_blacklisted: score -= 40

    # Community reports
    score -= min(n_reports * 5, 30)
    score -= min(n_upvotes * 2, 20)

    # WHOIS privacy
    if is_whois_private: score -= 5

    # Scraper signals
    score -= min(scrape_pen, 15)

    # Rating signal (only if ≥ 3 reviews)
    if n_reviews >= 3 and avg_rating is not None:
        if avg_rating >= 4.0:   score += 10
        elif avg_rating < 2.0:  score -= 15
        elif avg_rating < 3.0:  score -= 10

    return max(0, min(score, 100))


def score_to_level(score: int) -> str:
    if score >= 80:   return "safe"
    if score >= 50:   return "caution"
    if score >= 20:   return "risky"
    return "dangerous"


def calc_confidence(
    whois: bool, gsb: bool, scrape: bool,
    n_reports: int, n_reviews: int
) -> str:
    signals = sum([whois, gsb, scrape, n_reports > 0, n_reviews >= 3])
    if signals == 0:                        return "none"
    if signals == 1:                        return "low"
    if signals == 2:                        return "preliminary"
    if n_reports > 0 or n_reviews >= 3:    return "community_backed"
    return "technical"
