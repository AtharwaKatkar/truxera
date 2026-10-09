"""
services/typosquatting.py
Detects typosquatting / domain similarity using Levenshtein distance.
No OpenAI — pure algorithmic comparison.
"""
import Levenshtein

KNOWN_BRANDS = [
    "google.com",
    "facebook.com",
    "amazon.com",
    "apple.com",
    "microsoft.com",
    "netflix.com",
    "youtube.com",
    "twitter.com",
    "instagram.com",
    "linkedin.com",
    "flipkart.com",
    "snapdeal.com",
    "myntra.com",
    "meesho.com",
    "paytm.com",
    "phonepe.com",
    "razorpay.com",
    "zomato.com",
    "swiggy.com",
    "makemytrip.com",
    "irctc.co.in",
    "sbi.co.in",
    "hdfcbank.com",
    "icicibank.com",
    "axisbank.com",
    "ola.com",
    "uber.com",
    "bigbasket.com",
    "nykaa.com",
    "tatacliq.com",
]


def _normalise(domain: str) -> str:
    """
    Applies homoglyph normalisation and strips the TLD,
    returning just the name portion for distance comparison.
    """
    name = domain.lower()
    # Homoglyph replacements
    name = name.replace("rn", "m")
    name = name.replace("0", "o")
    name = name.replace("1", "l")
    name = name.replace("vv", "w")
    # Strip TLD — take part before first dot
    name = name.split(".")[0]
    return name


def check_typosquatting(domain: str) -> dict:
    """
    Checks whether the given domain looks suspiciously similar to a known brand.
    Returns a dict with is_suspicious, similar_to, similarity_score, and warning.
    """
    try:
        norm_input = _normalise(domain)
        best_score = 0.0
        best_brand = None

        for brand in KNOWN_BRANDS:
            norm_brand = _normalise(brand)
            distance = Levenshtein.distance(norm_input, norm_brand)
            max_len = max(len(norm_input), len(norm_brand))
            if max_len == 0:
                continue
            similarity = 1.0 - (distance / max_len)
            if similarity > best_score:
                best_score = similarity
                best_brand = brand

        is_suspicious = best_score >= 0.85 and domain != best_brand

        return {
            "is_suspicious": is_suspicious,
            "similar_to": best_brand if is_suspicious else None,
            "similarity_score": best_score,
            "warning": (
                f"This domain looks similar to {best_brand} — verify you are on the real site."
                if is_suspicious
                else None
            ),
        }

    except Exception:
        return {
            "is_suspicious": False,
            "similar_to": None,
            "similarity_score": 0.0,
            "warning": None,
        }
