"""
services/ai_summary.py
Generates plain-language trust summaries using GPT-4o-mini.
Degrades gracefully when no API key is present.
"""
import os
import time

import openai

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# In-memory TTL cache: domain -> (summary_str, timestamp)
_cache: dict[str, tuple[str, float]] = {}
_CACHE_TTL = 3600  # seconds


async def generate_summary(
    domain: str,
    trust_score: int,
    trust_level: str,
    domain_age_days: int | None,
    is_blacklisted: bool,
    n_reports: int,
    n_reviews: int,
    avg_rating: float | None,
    verified_checks: dict,
) -> str | None:
    """
    Returns a 2-3 sentence plain-English summary of the trust situation,
    or None if the API key is absent or any error occurs.
    """
    if not OPENAI_API_KEY:
        return None

    # Serve from cache if still fresh
    cached = _cache.get(domain)
    if cached:
        text, ts = cached
        if time.time() - ts < _CACHE_TTL:
            return text

    try:
        user_message = (
            f"Domain: {domain}\n"
            f"Trust score: {trust_score}/100\n"
            f"Trust level: {trust_level}\n"
            f"Domain age (days): {domain_age_days if domain_age_days is not None else 'unknown'}\n"
            f"Blacklisted by Google Safe Browsing: {is_blacklisted}\n"
            f"Community fraud reports: {n_reports}\n"
            f"Community reviews: {n_reviews}\n"
            f"Average star rating: {avg_rating if avg_rating is not None else 'no data'}\n"
            f"Technical checks: {verified_checks}"
        )

        system_prompt = (
            "You are a factual, concise website trust analyst for an Indian audience. "
            "Write 2-3 sentences in plain English summarising the trust situation for this domain. "
            "Only use the data provided. Never fabricate. Never use the word guaranteed."
        )

        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=120,
            temperature=0.3,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )

        content = response.choices[0].message.content
        _cache[domain] = (content, time.time())
        return content

    except Exception:
        return None
