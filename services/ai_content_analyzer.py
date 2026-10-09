"""
services/ai_content_analyzer.py
Scans homepage text for scam patterns using GPT-4o-mini.
Degrades gracefully when no API key is present.
"""
import json
import os

import openai

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

_FALLBACK = {"scam_signals": [], "scam_likelihood": "low", "penalty": 0}


async def analyze_content(homepage_text: str, domain: str) -> dict:
    """
    Analyses homepage text for scam patterns.
    Returns {'scam_signals': list[str], 'scam_likelihood': 'low'|'medium'|'high', 'penalty': int}.
    Never raises — returns zero-penalty fallback on any error.
    """
    if not OPENAI_API_KEY or not homepage_text:
        return _FALLBACK.copy()

    try:
        # Truncate to 2000 chars before sending
        truncated = homepage_text[:2000]

        system_prompt = (
            "You are a scam detection expert for Indian websites. "
            "Analyse the text for: urgency language, fake prize claims, advance-fee patterns, "
            "brand impersonation, misleading contact info. "
            'Reply ONLY as JSON: {"scam_signals": ["..."], "scam_likelihood": "low|medium|high", "penalty": <0-20>}. '
            "penalty=0 for low, 5-10 for medium, 11-20 for high."
        )

        user_message = f"Domain: {domain}\nHomepage text:\n{truncated}"

        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=150,
            temperature=0.1,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )

        raw = response.choices[0].message.content
        result = json.loads(raw)

        # Validate and clamp penalty
        penalty = max(0, min(20, int(result.get("penalty", 0))))

        return {
            "scam_signals": result.get("scam_signals", []),
            "scam_likelihood": result.get("scam_likelihood", "low"),
            "penalty": penalty,
        }

    except Exception:
        return _FALLBACK.copy()
