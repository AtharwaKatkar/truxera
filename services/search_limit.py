"""
services/search_limit.py
────────────────────────────────────────────────────────────
Guest search limit: 2 free searches per IP per 24 hours.
Uses MongoDB for persistence (no Redis needed).
Logged-in users bypass this entirely.

Collection: search_quota
  { ip, count, window_start, updated_at }
"""

from datetime import datetime, timedelta
from fastapi import HTTPException, Request

FREE_LIMIT      = 2          # searches allowed without login
WINDOW_HOURS    = 24         # rolling window in hours

# Injected from main.py after db is created
_quota_col = None

def init_quota(collection):
    global _quota_col
    _quota_col = collection


def _get_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    return xff.split(",")[0].strip() if xff else (request.client.host or "unknown")


async def check_and_increment(request: Request, is_logged_in: bool) -> dict:
    """
    Call this at the start of every /website/{domain} request.

    - Logged-in users: always allowed, returns {"allowed": True, "remaining": None}
    - Guest users:
        - Under limit: increments count, returns {"allowed": True, "remaining": N}
        - At limit: raises HTTP 429 with LOGIN_REQUIRED body
    """
    if is_logged_in:
        return {"allowed": True, "remaining": None}

    ip      = _get_ip(request)
    now     = datetime.utcnow()
    window  = now - timedelta(hours=WINDOW_HOURS)

    if _quota_col is None:
        # DB not available — fail open (allow search)
        return {"allowed": True, "remaining": FREE_LIMIT}

    try:
        doc = await _quota_col.find_one({"ip": ip})

        if doc is None or doc["window_start"] < window:
            # First search or window expired — reset
            await _quota_col.update_one(
                {"ip": ip},
                {"$set": {"ip": ip, "count": 1,
                           "window_start": now, "updated_at": now}},
                upsert=True,
            )
            remaining = FREE_LIMIT - 1
            return {"allowed": True, "remaining": remaining}

        count = doc["count"]

        if count >= FREE_LIMIT:
            # Limit reached
            raise HTTPException(
                status_code=429,
                detail={
                    "error":   "LOGIN_REQUIRED",
                    "message": "You've used your 2 free searches. Sign in for unlimited access.",
                    "remaining": 0,
                },
            )

        # Increment
        await _quota_col.update_one(
            {"ip": ip},
            {"$inc": {"count": 1}, "$set": {"updated_at": now}},
        )
        remaining = FREE_LIMIT - (count + 1)
        return {"allowed": True, "remaining": remaining}

    except HTTPException:
        raise
    except Exception:
        # DB error — fail open
        return {"allowed": True, "remaining": None}


async def reset_quota(request: Request):
    """Call on successful login to reset the guest quota for this IP."""
    if _quota_col is None:
        return
    ip = _get_ip(request)
    try:
        await _quota_col.delete_one({"ip": ip})
    except Exception:
        pass
