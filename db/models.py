"""
db/models.py
────────────────────────────────────────────────────────────
Truxera — PostgreSQL schema using SQLModel (SQLAlchemy + Pydantic).

Design principles:
  - Computed fields (avg_rating, trust_score, etc.) are STORED and
    refreshed on write — avoids expensive aggregations on every read.
  - Raw external API data (WHOIS, GSB, scrape) stays in MongoDB.
  - All timestamps are UTC, stored as TIMESTAMP WITH TIME ZONE.
  - Soft deletes via `is_deleted` flag — never hard-delete user content.
  - Enum types are PostgreSQL native enums for constraint + performance.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship, Column
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, TEXT, JSONB


# ── ENUMS ─────────────────────────────────────────────────

class TrustLevel(str, enum.Enum):
    safe       = "safe"
    caution    = "caution"
    risky      = "risky"
    dangerous  = "dangerous"

class ConfidenceLevel(str, enum.Enum):
    none             = "none"
    low              = "low"
    preliminary      = "preliminary"
    technical        = "technical"
    community_backed = "community_backed"

class ReviewType(str, enum.Enum):
    positive = "positive"
    negative = "negative"
    neutral  = "neutral"

class ReviewStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"
    flagged  = "flagged"

class ReportStatus(str, enum.Enum):
    pending  = "pending"
    verified = "verified"
    rejected = "rejected"
    resolved = "resolved"

class IssueType(str, enum.Enum):
    payment_fraud     = "payment_fraud"
    not_delivered     = "not_delivered"
    fake_job          = "fake_job"
    fake_education    = "fake_education"
    investment_fraud  = "investment_fraud"
    visa_immigration  = "visa_immigration"
    fake_loan         = "fake_loan"
    astrology_scam    = "astrology_scam"
    genuine_purchase  = "genuine_purchase"
    good_support      = "good_support"
    safe_payment      = "safe_payment"
    refund_received   = "refund_received"
    other             = "other"

class FlagReason(str, enum.Enum):
    spam          = "spam"
    fake_review   = "fake_review"
    offensive     = "offensive"
    wrong_website = "wrong_website"
    other         = "other"

class FlagStatus(str, enum.Enum):
    open     = "open"
    resolved = "resolved"
    ignored  = "ignored"


# ── BASE ──────────────────────────────────────────────────

class TimestampMixin(SQLModel):
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(sa.DateTime(timezone=True), nullable=False,
                         server_default=sa.func.now())
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(sa.DateTime(timezone=True), nullable=False,
                         server_default=sa.func.now(),
                         onupdate=sa.func.now())
    )


# ── USERS ─────────────────────────────────────────────────

class User(TimestampMixin, SQLModel, table=True):
    """
    Platform users. Supports anonymous submissions via is_anonymous flag
    on reviews/reports — user_id is still stored for moderation.
    """
    __tablename__ = "users"

    id:               int            = Field(default=None, primary_key=True)
    email:            str            = Field(sa_column=Column(sa.String(255), unique=True, nullable=False, index=True))
    username:         Optional[str]  = Field(default=None, sa_column=Column(sa.String(60), unique=True, nullable=True))
    hashed_password:  str            = Field(sa_column=Column(sa.Text, nullable=False))
    is_verified:      bool           = Field(default=False)
    is_banned:        bool           = Field(default=False)
    is_admin:         bool           = Field(default=False)
    reputation:       int            = Field(default=0)          # earned via approved reviews
    reviews_count:    int            = Field(default=0)          # cached count
    reports_count:    int            = Field(default=0)          # cached count
    last_active_at:   Optional[datetime] = Field(default=None, sa_column=Column(sa.DateTime(timezone=True), nullable=True))

    # Relationships
    reviews:      List["Review"]      = Relationship(back_populates="user")
    reports:      List["ScamReport"]  = Relationship(back_populates="user")
    watchlist:    List["Watchlist"]   = Relationship(back_populates="user")
    helpful_votes:List["HelpfulVote"] = Relationship(back_populates="user")


# ── WEBSITES ──────────────────────────────────────────────

class Website(TimestampMixin, SQLModel, table=True):
    """
    One row per unique domain. Trust score and aggregates are stored
    (not computed on read) and refreshed whenever new data arrives.

    Raw WHOIS/GSB/scrape data lives in MongoDB — only the derived
    signals are stored here for fast querying.
    """
    __tablename__ = "websites"
    __table_args__ = (
        sa.Index("ix_websites_trust_score", "trust_score"),
        sa.Index("ix_websites_reports_count", "reports_count"),
        sa.Index("ix_websites_average_rating", "average_rating"),
    )

    id:               int            = Field(default=None, primary_key=True)
    domain:           str            = Field(sa_column=Column(sa.String(253), unique=True, nullable=False, index=True))

    # ── Trust score (stored, refreshed on write) ──────────
    trust_score:      int            = Field(default=50, ge=0, le=100)
    trust_level:      TrustLevel     = Field(default=TrustLevel.caution)
    confidence:       ConfidenceLevel= Field(default=ConfidenceLevel.none)

    # ── Reasons (stored as array for fast display) ────────
    risk_reasons:     Optional[List[str]] = Field(
        default=None,
        sa_column=Column(ARRAY(TEXT), nullable=True)
    )

    # ── Technical signals (derived from external APIs) ────
    domain_age_days:  Optional[int]  = Field(default=None)
    registrar:        Optional[str]  = Field(default=None, sa_column=Column(sa.String(200), nullable=True))
    is_whois_private: bool           = Field(default=False)
    is_blacklisted:   bool           = Field(default=False)
    threat_types:     Optional[List[str]] = Field(
        default=None,
        sa_column=Column(ARRAY(TEXT), nullable=True)
    )
    has_contact_page: bool           = Field(default=False)
    has_about_page:   bool           = Field(default=False)
    has_privacy_page: bool           = Field(default=False)
    site_title:       Optional[str]  = Field(default=None, sa_column=Column(sa.String(300), nullable=True))
    suspicious_keywords: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(ARRAY(TEXT), nullable=True)
    )

    # ── Community aggregates (stored, refreshed on write) ─
    reviews_count:    int            = Field(default=0)
    average_rating:   Optional[float]= Field(default=None)       # None = no reviews yet
    rating_1:         int            = Field(default=0)
    rating_2:         int            = Field(default=0)
    rating_3:         int            = Field(default=0)
    rating_4:         int            = Field(default=0)
    rating_5:         int            = Field(default=0)
    positive_count:   int            = Field(default=0)
    negative_count:   int            = Field(default=0)
    reports_count:    int            = Field(default=0)
    total_amount_lost:float          = Field(default=0.0)
    upvotes_count:    int            = Field(default=0)

    # ── Freshness ─────────────────────────────────────────
    last_analyzed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(sa.DateTime(timezone=True), nullable=True)
    )
    is_claimed:       bool           = Field(default=False)

    # Relationships
    reviews:  List["Review"]     = Relationship(back_populates="website")
    reports:  List["ScamReport"] = Relationship(back_populates="website")
    watchlist:List["Watchlist"]  = Relationship(back_populates="website")


# ── REVIEWS ───────────────────────────────────────────────

class Review(TimestampMixin, SQLModel, table=True):
    """
    Star-rated written reviews. Supports anonymous submission,
    proof uploads, and moderation workflow.

    Duplicate prevention: unique constraint on (user_id, domain_id)
    for logged-in users. For guests, enforced at application level
    via IP + time window (stored in search_usage_limits).
    """
    __tablename__ = "reviews"
    __table_args__ = (
        # One review per user per website
        sa.UniqueConstraint("user_id", "website_id", name="uq_review_user_website"),
        sa.Index("ix_reviews_website_status", "website_id", "status"),
        sa.Index("ix_reviews_website_created", "website_id", "created_at"),
        sa.Index("ix_reviews_helpful_votes", "helpful_votes_count"),
        sa.Index("ix_reviews_spam_score", "spam_score"),
    )

    id:               int            = Field(default=None, primary_key=True)
    website_id:       int            = Field(foreign_key="websites.id", nullable=False, index=True)
    user_id:          Optional[int]  = Field(default=None, foreign_key="users.id", nullable=True, index=True)

    # ── Content ───────────────────────────────────────────
    rating:           int            = Field(ge=1, le=5)
    title:            str            = Field(sa_column=Column(sa.String(120), nullable=False))
    review_text:      str            = Field(sa_column=Column(sa.Text, nullable=False))
    review_type:      ReviewType     = Field(default=ReviewType.neutral)
    issue_type:       Optional[IssueType] = Field(default=None, nullable=True)

    # ── Experience fields ─────────────────────────────────
    used_or_paid:         bool           = Field(default=False)
    payment_successful:   Optional[bool] = Field(default=None)
    received_service:     Optional[bool] = Field(default=None)
    support_responded:    Optional[bool] = Field(default=None)
    would_trust_again:    Optional[bool] = Field(default=None)

    # ── Identity ──────────────────────────────────────────
    is_anonymous:     bool           = Field(default=False)
    reviewer_name:    Optional[str]  = Field(default=None, sa_column=Column(sa.String(80), nullable=True))
    submitter_ip:     Optional[str]  = Field(default=None, sa_column=Column(sa.String(45), nullable=True))  # IPv6 max

    # ── Moderation ────────────────────────────────────────
    status:           ReviewStatus   = Field(default=ReviewStatus.pending)
    spam_score:       int            = Field(default=0, ge=0, le=100)
    verified_flag:    bool           = Field(default=False)      # admin-verified proof
    is_deleted:       bool           = Field(default=False)

    # ── Engagement (stored for fast sort) ─────────────────
    helpful_votes_count: int         = Field(default=0)
    flags_count:      int            = Field(default=0)

    # Relationships
    website:      Optional["Website"]      = Relationship(back_populates="reviews")
    user:         Optional["User"]         = Relationship(back_populates="reviews")
    helpful_votes:List["HelpfulVote"]      = Relationship(back_populates="review")
    proof_uploads:List["ProofUpload"]      = Relationship(back_populates="review")
    flags:        List["ModerationFlag"]   = Relationship(back_populates="review")


# ── HELPFUL VOTES ─────────────────────────────────────────

class HelpfulVote(SQLModel, table=True):
    """
    Tracks who found a review helpful. One vote per user per review.
    IP-based dedup for guests.
    """
    __tablename__ = "helpful_votes"
    __table_args__ = (
        sa.UniqueConstraint("review_id", "user_id", name="uq_vote_user_review"),
        sa.UniqueConstraint("review_id", "voter_ip", name="uq_vote_ip_review"),
    )

    id:         int           = Field(default=None, primary_key=True)
    review_id:  int           = Field(foreign_key="reviews.id", nullable=False, index=True)
    user_id:    Optional[int] = Field(default=None, foreign_key="users.id", nullable=True)
    voter_ip:   Optional[str] = Field(default=None, sa_column=Column(sa.String(45), nullable=True))
    created_at: datetime      = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )

    review: Optional["Review"] = Relationship(back_populates="helpful_votes")
    user:   Optional["User"]   = Relationship(back_populates="helpful_votes")


# ── SCAM REPORTS ──────────────────────────────────────────

class ScamReport(TimestampMixin, SQLModel, table=True):
    """
    Community scam/fraud reports. Separate from reviews —
    these are incident reports, not ratings.
    """
    __tablename__ = "scam_reports"
    __table_args__ = (
        sa.Index("ix_reports_website_status", "website_id", "status"),
        sa.Index("ix_reports_created", "created_at"),
    )

    id:           int            = Field(default=None, primary_key=True)
    website_id:   int            = Field(foreign_key="websites.id", nullable=False, index=True)
    user_id:      Optional[int]  = Field(default=None, foreign_key="users.id", nullable=True)

    title:        str            = Field(sa_column=Column(sa.String(200), nullable=False))
    description:  str            = Field(sa_column=Column(sa.Text, nullable=False))
    issue_type:   IssueType      = Field(default=IssueType.other)
    amount_paid:  Optional[float]= Field(default=None)
    currency:     str            = Field(default="INR", sa_column=Column(sa.String(3), nullable=False))

    is_anonymous: bool           = Field(default=False)
    submitter_ip: Optional[str]  = Field(default=None, sa_column=Column(sa.String(45), nullable=True))
    upvotes:      int            = Field(default=0)
    status:       ReportStatus   = Field(default=ReportStatus.pending)
    is_deleted:   bool           = Field(default=False)

    website: Optional["Website"] = Relationship(back_populates="reports")
    user:    Optional["User"]    = Relationship(back_populates="reports")
    proofs:  List["ProofUpload"] = Relationship(back_populates="report")


# ── PROOF UPLOADS ─────────────────────────────────────────

class ProofUpload(TimestampMixin, SQLModel, table=True):
    """
    File uploads attached to reviews or reports.
    Actual files stored in object storage (S3/Cloudinary/local).
    """
    __tablename__ = "proof_uploads"

    id:           int            = Field(default=None, primary_key=True)
    review_id:    Optional[int]  = Field(default=None, foreign_key="reviews.id", nullable=True, index=True)
    report_id:    Optional[int]  = Field(default=None, foreign_key="scam_reports.id", nullable=True, index=True)
    uploader_id:  Optional[int]  = Field(default=None, foreign_key="users.id", nullable=True)

    filename:     str            = Field(sa_column=Column(sa.String(255), nullable=False))
    storage_url:  str            = Field(sa_column=Column(sa.Text, nullable=False))
    file_type:    str            = Field(sa_column=Column(sa.String(50), nullable=False))  # image/jpeg etc
    file_size_kb: int            = Field(default=0)
    is_verified:  bool           = Field(default=False)   # admin confirmed genuine

    review: Optional["Review"]      = Relationship(back_populates="proof_uploads")
    report: Optional["ScamReport"]  = Relationship(back_populates="proofs")


# ── MODERATION FLAGS ──────────────────────────────────────

class ModerationFlag(TimestampMixin, SQLModel, table=True):
    """
    User-submitted flags on reviews or websites.
    Auto-escalates review to 'flagged' status after 3 flags.
    """
    __tablename__ = "moderation_flags"
    __table_args__ = (
        # One flag per user per target
        sa.UniqueConstraint("review_id", "flagger_id", name="uq_flag_user_review"),
        sa.UniqueConstraint("review_id", "flagger_ip", name="uq_flag_ip_review"),
        sa.Index("ix_flags_review", "review_id"),
        sa.Index("ix_flags_status", "status"),
    )

    id:           int            = Field(default=None, primary_key=True)
    review_id:    Optional[int]  = Field(default=None, foreign_key="reviews.id", nullable=True)
    website_id:   Optional[int]  = Field(default=None, foreign_key="websites.id", nullable=True)
    flagger_id:   Optional[int]  = Field(default=None, foreign_key="users.id", nullable=True)
    flagger_ip:   Optional[str]  = Field(default=None, sa_column=Column(sa.String(45), nullable=True))

    reason:       FlagReason     = Field(default=FlagReason.other)
    notes:        Optional[str]  = Field(default=None, sa_column=Column(sa.Text, nullable=True))
    status:       FlagStatus     = Field(default=FlagStatus.open)
    resolved_by:  Optional[int]  = Field(default=None, foreign_key="users.id", nullable=True)

    review: Optional["Review"] = Relationship(
        back_populates="flags",
        sa_relationship_kwargs={"foreign_keys": "[ModerationFlag.review_id]"}
    )


# ── WATCHLIST ─────────────────────────────────────────────

class Watchlist(TimestampMixin, SQLModel, table=True):
    """
    Users can watch/follow a domain to get notified of new reports.
    """
    __tablename__ = "watchlists"
    __table_args__ = (
        sa.UniqueConstraint("user_id", "website_id", name="uq_watchlist_user_website"),
    )

    id:         int  = Field(default=None, primary_key=True)
    user_id:    int  = Field(foreign_key="users.id", nullable=False, index=True)
    website_id: int  = Field(foreign_key="websites.id", nullable=False, index=True)
    notify_new_reports:  bool = Field(default=True)
    notify_new_reviews:  bool = Field(default=False)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )

    user:    Optional["User"]    = Relationship(back_populates="watchlist")
    website: Optional["Website"] = Relationship(back_populates="watchlist")


# ── SEARCH USAGE LIMITS ───────────────────────────────────

class SearchUsageLimit(SQLModel, table=True):
    """
    Guest search quota tracking. Redis is preferred for this in production
    (see services/cache.py), but this table serves as a fallback and
    provides audit history.

    TTL handled by a scheduled cleanup job (delete where window_start < now - 24h).
    """
    __tablename__ = "search_usage_limits"
    __table_args__ = (
        sa.Index("ix_search_limits_ip", "ip_address"),
        sa.Index("ix_search_limits_window", "window_start"),
    )

    id:           int      = Field(default=None, primary_key=True)
    ip_address:   str      = Field(sa_column=Column(sa.String(45), nullable=False))
    search_count: int      = Field(default=1)
    window_start: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(sa.DateTime(timezone=True), nullable=False)
    )
    updated_at:   datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(sa.DateTime(timezone=True), nullable=False)
    )
