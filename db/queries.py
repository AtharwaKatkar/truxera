"""
db/queries.py
────────────────────────────────────────────────────────────
Production-ready query functions for Truxera.

All queries use SQLAlchemy 2.x async style.
Aggregates are computed in PostgreSQL — not in Python.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, and_, desc, text
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from typing import Optional

from db.models import (
    Website, Review, ScamReport, HelpfulVote,
    ModerationFlag, ReviewStatus, FlagStatus,
    TrustLevel, ConfidenceLevel,
)


# ── WEBSITE DETAIL PAGE ───────────────────────────────────

async def get_website_by_domain(db: AsyncSession, domain: str) -> Optional[Website]:
    """Fetch website with all aggregates pre-loaded."""
    result = await db.execute(
        select(Website).where(Website.domain == domain)
    )
    return result.scalar_one_or_none()


async def get_or_create_website(db: AsyncSession, domain: str) -> Website:
    site = await get_website_by_domain(db, domain)
    if not site:
        site = Website(domain=domain)
        db.add(site)
        await db.flush()   # get the ID without committing
    return site


# ── RATINGS SUMMARY ───────────────────────────────────────

async def get_ratings_summary(db: AsyncSession, website_id: int) -> dict:
    """
    Compute rating distribution directly in PostgreSQL.
    Returns dict ready for API response.
    """
    result = await db.execute(
        select(
            func.count(Review.id).label("total"),
            func.avg(Review.rating).label("avg_rating"),
            func.sum(
                func.cast(Review.rating == 5, sa_Integer)
            ).label("r5"),
            func.sum(
                func.cast(Review.rating == 4, sa_Integer)
            ).label("r4"),
            func.sum(
                func.cast(Review.rating == 3, sa_Integer)
            ).label("r3"),
            func.sum(
                func.cast(Review.rating == 2, sa_Integer)
            ).label("r2"),
            func.sum(
                func.cast(Review.rating == 1, sa_Integer)
            ).label("r1"),
            func.sum(
                func.cast(Review.review_type == "positive", sa_Integer)
            ).label("positive"),
            func.sum(
                func.cast(Review.review_type == "negative", sa_Integer)
            ).label("negative"),
        ).where(
            and_(
                Review.website_id == website_id,
                Review.status == ReviewStatus.approved,
                Review.is_deleted == False,
            )
        )
    )
    row = result.one()
    total = row.total or 0
    avg   = round(float(row.avg_rating), 2) if row.avg_rating else None
    pos   = row.positive or 0
    neg   = row.negative or 0

    return {
        "total_reviews":  total,
        "average_rating": avg,
        "distribution":   {"5": row.r5 or 0, "4": row.r4 or 0, "3": row.r3 or 0,
                           "2": row.r2 or 0, "1": row.r1 or 0},
        "positive_count": pos,
        "negative_count": neg,
        "positive_pct":   round(pos / total * 100) if total else None,
        "negative_pct":   round(neg / total * 100) if total else None,
    }


# ── RECENT REVIEWS ────────────────────────────────────────

async def get_recent_reviews(
    db: AsyncSession,
    website_id: int,
    sort: str = "newest",
    filter_type: str = "all",
    page: int = 1,
    limit: int = 10,
) -> tuple[list, int]:
    """
    Returns (reviews, total_count).
    Sorting and filtering done in PostgreSQL.
    """
    base = and_(
        Review.website_id == website_id,
        Review.status == ReviewStatus.approved,
        Review.is_deleted == False,
    )

    if filter_type == "positive":
        base = and_(base, Review.review_type == "positive")
    elif filter_type == "negative":
        base = and_(base, Review.review_type == "negative")
    elif filter_type == "verified":
        base = and_(base, Review.verified_flag == True)

    order = {
        "newest":  desc(Review.created_at),
        "helpful": desc(Review.helpful_votes_count),
        "highest": desc(Review.rating),
        "lowest":  Review.rating,
    }.get(sort, desc(Review.created_at))

    count_result = await db.execute(
        select(func.count(Review.id)).where(base)
    )
    total = count_result.scalar_one()

    reviews_result = await db.execute(
        select(Review)
        .where(base)
        .order_by(order)
        .offset((page - 1) * limit)
        .limit(limit)
        .options(selectinload(Review.proof_uploads))
    )
    reviews = reviews_result.scalars().all()
    return reviews, total


# ── TOP HELPFUL REVIEWS ───────────────────────────────────

async def get_top_helpful_reviews(
    db: AsyncSession, website_id: int, review_type: str, limit: int = 1
) -> list:
    result = await db.execute(
        select(Review)
        .where(and_(
            Review.website_id == website_id,
            Review.status == ReviewStatus.approved,
            Review.review_type == review_type,
            Review.is_deleted == False,
        ))
        .order_by(desc(Review.helpful_votes_count))
        .limit(limit)
    )
    return result.scalars().all()


# ── MOST REPORTED WEBSITES ────────────────────────────────

async def get_most_reported_websites(db: AsyncSession, limit: int = 10) -> list:
    """Top websites by report count — uses stored aggregate."""
    result = await db.execute(
        select(Website)
        .where(Website.reports_count > 0)
        .order_by(desc(Website.reports_count))
        .limit(limit)
    )
    return result.scalars().all()


# ── TRENDING (last 7 days) ────────────────────────────────

async def get_trending_websites(db: AsyncSession, limit: int = 10) -> list:
    """Websites with most reports in the last 7 days."""
    week_ago = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(
        select(
            ScamReport.website_id,
            func.count(ScamReport.id).label("recent_reports"),
        )
        .where(ScamReport.created_at >= week_ago)
        .group_by(ScamReport.website_id)
        .order_by(desc("recent_reports"))
        .limit(limit)
    )
    rows = result.all()
    # Fetch website details
    website_ids = [r.website_id for r in rows]
    if not website_ids:
        return []
    sites = await db.execute(
        select(Website).where(Website.id.in_(website_ids))
    )
    site_map = {s.id: s for s in sites.scalars().all()}
    return [
        {"website": site_map[r.website_id], "reports_7d": r.recent_reports}
        for r in rows if r.website_id in site_map
    ]


# ── MODERATION QUEUE ──────────────────────────────────────

async def get_moderation_queue(
    db: AsyncSession, limit: int = 30
) -> list:
    """
    Reviews that need admin attention:
    - status = pending or flagged
    - ordered by spam_score DESC (worst first)
    """
    result = await db.execute(
        select(Review)
        .where(
            and_(
                Review.status.in_(["pending", "flagged"]),
                Review.is_deleted == False,
            )
        )
        .order_by(desc(Review.spam_score), desc(Review.flags_count))
        .limit(limit)
        .options(selectinload(Review.proof_uploads))
    )
    return result.scalars().all()


# ── DUPLICATE REVIEW DETECTION ────────────────────────────

async def check_duplicate_review(
    db: AsyncSession,
    website_id: int,
    user_id: Optional[int],
    ip: Optional[str],
    window_hours: int = 24,
) -> bool:
    """
    Returns True if a duplicate review exists.
    Checks by user_id (logged in) OR by IP within time window (guest).
    """
    window = datetime.utcnow() - timedelta(hours=window_hours)

    if user_id:
        result = await db.execute(
            select(Review.id).where(
                and_(
                    Review.website_id == website_id,
                    Review.user_id == user_id,
                )
            ).limit(1)
        )
        return result.scalar_one_or_none() is not None

    if ip:
        result = await db.execute(
            select(Review.id).where(
                and_(
                    Review.website_id == website_id,
                    Review.submitter_ip == ip,
                    Review.created_at >= window,
                )
            ).limit(1)
        )
        return result.scalar_one_or_none() is not None

    return False


# ── REFRESH WEBSITE AGGREGATES ────────────────────────────

async def refresh_website_aggregates(db: AsyncSession, website_id: int):
    """
    Recompute and store all aggregates for a website.
    Call this after any review/report insert or status change.
    This is the key pattern: compute in PG, store for fast reads.
    """
    # Rating aggregates from approved reviews
    rating_agg = await db.execute(
        select(
            func.count(Review.id).label("total"),
            func.avg(Review.rating).label("avg"),
            func.sum(func.cast(Review.rating == 5, sa_Integer)).label("r5"),
            func.sum(func.cast(Review.rating == 4, sa_Integer)).label("r4"),
            func.sum(func.cast(Review.rating == 3, sa_Integer)).label("r3"),
            func.sum(func.cast(Review.rating == 2, sa_Integer)).label("r2"),
            func.sum(func.cast(Review.rating == 1, sa_Integer)).label("r1"),
            func.sum(func.cast(Review.review_type == "positive", sa_Integer)).label("pos"),
            func.sum(func.cast(Review.review_type == "negative", sa_Integer)).label("neg"),
        ).where(
            and_(
                Review.website_id == website_id,
                Review.status == ReviewStatus.approved,
                Review.is_deleted == False,
            )
        )
    )
    ra = rating_agg.one()

    # Report aggregates
    report_agg = await db.execute(
        select(
            func.count(ScamReport.id).label("total"),
            func.sum(func.coalesce(ScamReport.amount_paid, 0)).label("total_lost"),
            func.sum(ScamReport.upvotes).label("upvotes"),
        ).where(
            and_(
                ScamReport.website_id == website_id,
                ScamReport.is_deleted == False,
            )
        )
    )
    rpa = report_agg.one()

    await db.execute(
        update(Website)
        .where(Website.id == website_id)
        .values(
            reviews_count    = ra.total or 0,
            average_rating   = round(float(ra.avg), 2) if ra.avg else None,
            rating_5         = ra.r5 or 0,
            rating_4         = ra.r4 or 0,
            rating_3         = ra.r3 or 0,
            rating_2         = ra.r2 or 0,
            rating_1         = ra.r1 or 0,
            positive_count   = ra.pos or 0,
            negative_count   = ra.neg or 0,
            reports_count    = rpa.total or 0,
            total_amount_lost= float(rpa.total_lost or 0),
            upvotes_count    = int(rpa.upvotes or 0),
            updated_at       = datetime.utcnow(),
        )
    )


# ── ADMIN STATS ───────────────────────────────────────────

async def get_admin_stats(db: AsyncSession) -> dict:
    results = await db.execute(
        select(
            func.count(Review.id).label("total_reviews"),
            func.sum(func.cast(Review.status == "pending", sa_Integer)).label("pending"),
            func.sum(func.cast(Review.status == "flagged", sa_Integer)).label("flagged"),
        )
    )
    r = results.one()

    open_flags = await db.execute(
        select(func.count(ModerationFlag.id))
        .where(ModerationFlag.status == FlagStatus.open)
    )

    return {
        "total_reviews":  r.total_reviews or 0,
        "pending_reviews":r.pending or 0,
        "flagged_reviews":r.flagged or 0,
        "open_flags":     open_flags.scalar_one() or 0,
    }


# ── IMPORT FIX ────────────────────────────────────────────
# SQLAlchemy Integer type for cast expressions
from sqlalchemy import Integer as sa_Integer
