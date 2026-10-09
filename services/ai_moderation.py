"""
services/ai_moderation.py
AI-based review quality scoring using GPT-4o-mini.
Degrades gracefully when no API key is present.
"""
import json
import os

import openai

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

_FALLBACK = {"quality_score": 50, "classification": "unknown", "reason": "AI moderation unavailable"}


async def score_review(review_text: str, star_rating: int, domain: str) -> dict:
    """
    Returns a dict with quality_score (0-100), classification
    ('genuine'|'suspicious'|'fake'|'unknown'), and reason.
    Never raises — returns fallback on any error.
    """
    if not OPENAI_API_KEY:
        return _FALLBACK.copy()

    try:
        system_prompt = (
            "You are a review quality analyst. "
            "Score the review 0-100 for quality (0=obvious spam/fake, 100=detailed genuine experience). "
            "Classify as: genuine, suspicious, or fake. "
            'Reply ONLY as JSON: {"quality_score": <int>, "classification": "genuine|suspicious|fake", "reason": "<one sentence>"}'
        )

        user_message = (
            f"Domain: {domain}\n"
            f"Star rating: {star_rating}/5\n"
            f"Review text: {review_text}"
        )

        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=80,
            temperature=0.1,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )

        raw = response.choices[0].message.content
        result = json.loads(raw)
        # Ensure required keys exist
        return {
            "quality_score": int(result.get("quality_score", 50)),
            "classification": result.get("classification", "unknown"),
            "reason": result.get("reason", ""),
        }

    except Exception:
        return _FALLBACK.copy()


def combined_moderation_decision(
    regex_score: int, ai_score: int, ai_classification: str
) -> str:
    """
    Combines the regex spam score and AI quality score into a final moderation decision.
    Returns 'rejected', 'flagged', or 'approved'.
    """
    if ai_classification == "fake" or (regex_score >= 80 and ai_score < 30):
        return "rejected"
    if ai_classification == "suspicious" or regex_score >= 50 or ai_score < 40:
        return "flagged"
    return "approved"
