"""
services/cache.py
────────────────────────────────────────────────────────────
Redis integration for:
  1. Guest search quota (replaces MongoDB search_quota collection)
  2. Trust score result caching (avoid re-running analysis)
  3. Rate limiting helpers

Falls back gracefully if Redis is unavailable.
"""

import json
import os
from datetime import datetime
from typing import Optional

try:
    import redis.asyncio as aioredis
    _redis_available = True
except ImportError:
    _redis_available = False

REDIS_URL       = os.getenv("REDIS_URL", "redis://localhost:6379/0")
FREE_LIMIT      = 2
WINDOW_SECONDS  = 86400   # 24 hours
CACHE_TTL       = 3600    # 1 hour for trust score cache

_client: Optional[object] = None


async def get_redis():
    global _client
    if not _redis_available:
        return None
    if _client is None:
        try:
            _client = aioredis.from_url(REDIS_URL, decode_responses=True)
            await _client.ping()
        except Exception:
            _client = None
    return _client


# ── GUEST SEARCH QUOTA ────────────────────────────────────

async def check_search_quota(ip: str) -> dict:
    """
    Returns {"allowed": bool, "remaining": int | None, "count": int}.
    Falls back to allow-all if Redis is down.
    """
    r = await get_redis()
    if r is None:
        return {"allowed": True, "remaining": None, "count": 0}

    key = f"search_quota:{ip}"
    try:
        count = await r.get(key)
        if count is None:
            # First search — set with TTL
            await r.setex(key, WINDOW_SECONDS, 1)
            return {"allowed": True, "remaining": FREE_LIMIT - 1, "count": 1}

        count = int(count)
        if count >= FREE_LIMIT:
            return {"allowed": False, "remaining": 0, "count": count}

        await r.incr(key)
        remaining = FREE_LIMIT - (count + 1)
        return {"allowed": True, "remaining": remaining, "count": count + 1}
    except Exception:
        return {"allowed": True, "remaining": None, "count": 0}


async def reset_search_quota(ip: str):
    """Call on successful login to clear the guest quota."""
    r = await get_redis()
    if r:
        try:
            await r.delete(f"search_quota:{ip}")
        except Exception:
            pass


# ── TRUST SCORE CACHE ─────────────────────────────────────

async def get_cached_trust(domain: str) -> Optional[dict]:
    """Return cached trust result or None."""
    r = await get_redis()
    if r is None:
        return None
    try:
        raw = await r.get(f"trust:{domain}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def set_cached_trust(domain: str, data: dict, ttl: int = CACHE_TTL):
    """Cache trust result for TTL seconds."""
    r = await get_redis()
    if r is None:
        return
    try:
        await r.setex(f"trust:{domain}", ttl, json.dumps(data, default=str))
    except Exception:
        pass


async def invalidate_trust_cache(domain: str):
    """Call when new review/report is submitted for this domain."""
    r = await get_redis()
    if r:
        try:
            await r.delete(f"trust:{domain}")
        except Exception:
            pass


# ── RATE LIMITING ─────────────────────────────────────────

async def check_rate_limit(key: str, limit: int, window: int) -> bool:
    """
    Generic rate limiter. Returns True if allowed, False if rate limited.
    key: e.g. "review_submit:192.168.1.1"
    limit: max requests
    window: seconds
    """
    r = await get_redis()
    if r is None:
        return True   # fail open
    try:
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window)
        return count <= limit
    except Exception:
        return True
