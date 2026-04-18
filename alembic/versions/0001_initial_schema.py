"""Initial schema — all Truxera tables

Revision ID: 0001
Revises: 
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, TEXT

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── ENUM TYPES ────────────────────────────────────────
    op.execute("CREATE TYPE trustlevel AS ENUM ('safe','caution','risky','dangerous')")
    op.execute("CREATE TYPE confidencelevel AS ENUM ('none','low','preliminary','technical','community_backed')")
    op.execute("CREATE TYPE reviewtype AS ENUM ('positive','negative','neutral')")
    op.execute("CREATE TYPE reviewstatus AS ENUM ('pending','approved','rejected','flagged')")
    op.execute("CREATE TYPE reportstatus AS ENUM ('pending','verified','rejected','resolved')")
    op.execute("CREATE TYPE issuetype AS ENUM ('payment_fraud','not_delivered','fake_job','fake_education','investment_fraud','visa_immigration','fake_loan','astrology_scam','genuine_purchase','good_support','safe_payment','refund_received','other')")
    op.execute("CREATE TYPE flagreason AS ENUM ('spam','fake_review','offensive','wrong_website','other')")
    op.execute("CREATE TYPE flagstatus AS ENUM ('open','resolved','ignored')")

    # ── USERS ─────────────────────────────────────────────
    op.create_table("users",
        sa.Column("id",              sa.Integer,     primary_key=True),
        sa.Column("email",           sa.String(255), nullable=False, unique=True),
        sa.Column("username",        sa.String(60),  nullable=True,  unique=True),
        sa.Column("hashed_password", sa.Text,        nullable=False),
        sa.Column("is_verified",     sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("is_banned",       sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("is_admin",        sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("reputation",      sa.Integer,     nullable=False, server_default="0"),
        sa.Column("reviews_count",   sa.Integer,     nullable=False, server_default="0"),
        sa.Column("reports_count",   sa.Integer,     nullable=False, server_default="0"),
        sa.Column("last_active_at",  sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",      sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── WEBSITES ──────────────────────────────────────────
    op.create_table("websites",
        sa.Column("id",               sa.Integer,     primary_key=True),
        sa.Column("domain",           sa.String(253), nullable=False, unique=True),
        sa.Column("trust_score",      sa.Integer,     nullable=False, server_default="50"),
        sa.Column("trust_level",      sa.Enum("safe","caution","risky","dangerous", name="trustlevel"), nullable=False, server_default="caution"),
        sa.Column("confidence",       sa.Enum("none","low","preliminary","technical","community_backed", name="confidencelevel"), nullable=False, server_default="none"),
        sa.Column("risk_reasons",     ARRAY(TEXT),    nullable=True),
        sa.Column("domain_age_days",  sa.Integer,     nullable=True),
        sa.Column("registrar",        sa.String(200), nullable=True),
        sa.Column("is_whois_private", sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("is_blacklisted",   sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("threat_types",     ARRAY(TEXT),    nullable=True),
        sa.Column("has_contact_page", sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("has_about_page",   sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("has_privacy_page", sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("site_title",       sa.String(300), nullable=True),
        sa.Column("suspicious_keywords", ARRAY(TEXT), nullable=True),
        sa.Column("reviews_count",    sa.Integer,     nullable=False, server_default="0"),
        sa.Column("average_rating",   sa.Float,       nullable=True),
        sa.Column("rating_1",         sa.Integer,     nullable=False, server_default="0"),
        sa.Column("rating_2",         sa.Integer,     nullable=False, server_default="0"),
        sa.Column("rating_3",         sa.Integer,     nullable=False, server_default="0"),
        sa.Column("rating_4",         sa.Integer,     nullable=False, server_default="0"),
        sa.Column("rating_5",         sa.Integer,     nullable=False, server_default="0"),
        sa.Column("positive_count",   sa.Integer,     nullable=False, server_default="0"),
        sa.Column("negative_count",   sa.Integer,     nullable=False, server_default="0"),
        sa.Column("reports_count",    sa.Integer,     nullable=False, server_default="0"),
        sa.Column("total_amount_lost",sa.Float,       nullable=False, server_default="0"),
        sa.Column("upvotes_count",    sa.Integer,     nullable=False, server_default="0"),
        sa.Column("last_analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_claimed",       sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("created_at",       sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",       sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_websites_domain",        "websites", ["domain"])
    op.create_index("ix_websites_trust_score",   "websites", ["trust_score"])
    op.create_index("ix_websites_reports_count", "websites", ["reports_count"])
    op.create_index("ix_websites_avg_rating",    "websites", ["average_rating"])

    # ── REVIEWS ───────────────────────────────────────────
    op.create_table("reviews",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("website_id",          sa.Integer, sa.ForeignKey("websites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id",             sa.Integer, sa.ForeignKey("users.id",    ondelete="SET NULL"), nullable=True),
        sa.Column("rating",              sa.Integer, nullable=False),
        sa.Column("title",               sa.String(120), nullable=False),
        sa.Column("review_text",         sa.Text,    nullable=False),
        sa.Column("review_type",         sa.Enum("positive","negative","neutral", name="reviewtype"), nullable=False, server_default="neutral"),
        sa.Column("issue_type",          sa.Enum("payment_fraud","not_delivered","fake_job","fake_education","investment_fraud","visa_immigration","fake_loan","astrology_scam","genuine_purchase","good_support","safe_payment","refund_received","other", name="issuetype"), nullable=True),
        sa.Column("used_or_paid",        sa.Boolean, nullable=False, server_default="false"),
        sa.Column("payment_successful",  sa.Boolean, nullable=True),
        sa.Column("received_service",    sa.Boolean, nullable=True),
        sa.Column("support_responded",   sa.Boolean, nullable=True),
        sa.Column("would_trust_again",   sa.Boolean, nullable=True),
        sa.Column("is_anonymous",        sa.Boolean, nullable=False, server_default="false"),
        sa.Column("reviewer_name",       sa.String(80), nullable=True),
        sa.Column("submitter_ip",        sa.String(45), nullable=True),
        sa.Column("status",              sa.Enum("pending","approved","rejected","flagged", name="reviewstatus"), nullable=False, server_default="pending"),
        sa.Column("spam_score",          sa.Integer, nullable=False, server_default="0"),
        sa.Column("verified_flag",       sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_deleted",          sa.Boolean, nullable=False, server_default="false"),
        sa.Column("helpful_votes_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("flags_count",         sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at",          sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",          sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_review_rating"),
        sa.UniqueConstraint("user_id", "website_id", name="uq_review_user_website"),
    )
    op.create_index("ix_reviews_website_status",  "reviews", ["website_id", "status"])
    op.create_index("ix_reviews_website_created", "reviews", ["website_id", "created_at"])
    op.create_index("ix_reviews_helpful",         "reviews", ["helpful_votes_count"])
    op.create_index("ix_reviews_spam",            "reviews", ["spam_score"])

    # ── HELPFUL VOTES ─────────────────────────────────────
    op.create_table("helpful_votes",
        sa.Column("id",        sa.Integer, primary_key=True),
        sa.Column("review_id", sa.Integer, sa.ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id",   sa.Integer, sa.ForeignKey("users.id",   ondelete="SET NULL"), nullable=True),
        sa.Column("voter_ip",  sa.String(45), nullable=True),
        sa.Column("created_at",sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("review_id", "user_id",  name="uq_vote_user_review"),
        sa.UniqueConstraint("review_id", "voter_ip", name="uq_vote_ip_review"),
    )
    op.create_index("ix_helpful_votes_review", "helpful_votes", ["review_id"])

    # ── SCAM REPORTS ──────────────────────────────────────
    op.create_table("scam_reports",
        sa.Column("id",           sa.Integer, primary_key=True),
        sa.Column("website_id",   sa.Integer, sa.ForeignKey("websites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id",      sa.Integer, sa.ForeignKey("users.id",    ondelete="SET NULL"), nullable=True),
        sa.Column("title",        sa.String(200), nullable=False),
        sa.Column("description",  sa.Text,    nullable=False),
        sa.Column("issue_type",   sa.Enum("payment_fraud","not_delivered","fake_job","fake_education","investment_fraud","visa_immigration","fake_loan","astrology_scam","genuine_purchase","good_support","safe_payment","refund_received","other", name="issuetype"), nullable=False, server_default="other"),
        sa.Column("amount_paid",  sa.Float,   nullable=True),
        sa.Column("currency",     sa.String(3), nullable=False, server_default="INR"),
        sa.Column("is_anonymous", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("submitter_ip", sa.String(45), nullable=True),
        sa.Column("upvotes",      sa.Integer, nullable=False, server_default="0"),
        sa.Column("status",       sa.Enum("pending","verified","rejected","resolved", name="reportstatus"), nullable=False, server_default="pending"),
        sa.Column("is_deleted",   sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at",   sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",   sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_reports_website_status", "scam_reports", ["website_id", "status"])
    op.create_index("ix_reports_created",        "scam_reports", ["created_at"])

    # ── PROOF UPLOADS ─────────────────────────────────────
    op.create_table("proof_uploads",
        sa.Column("id",           sa.Integer, primary_key=True),
        sa.Column("review_id",    sa.Integer, sa.ForeignKey("reviews.id",     ondelete="CASCADE"), nullable=True),
        sa.Column("report_id",    sa.Integer, sa.ForeignKey("scam_reports.id",ondelete="CASCADE"), nullable=True),
        sa.Column("uploader_id",  sa.Integer, sa.ForeignKey("users.id",       ondelete="SET NULL"), nullable=True),
        sa.Column("filename",     sa.String(255), nullable=False),
        sa.Column("storage_url",  sa.Text,    nullable=False),
        sa.Column("file_type",    sa.String(50), nullable=False),
        sa.Column("file_size_kb", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_verified",  sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at",   sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",   sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── MODERATION FLAGS ──────────────────────────────────
    op.create_table("moderation_flags",
        sa.Column("id",          sa.Integer, primary_key=True),
        sa.Column("review_id",   sa.Integer, sa.ForeignKey("reviews.id",  ondelete="CASCADE"), nullable=True),
        sa.Column("website_id",  sa.Integer, sa.ForeignKey("websites.id", ondelete="CASCADE"), nullable=True),
        sa.Column("flagger_id",  sa.Integer, sa.ForeignKey("users.id",    ondelete="SET NULL"), nullable=True),
        sa.Column("flagger_ip",  sa.String(45), nullable=True),
        sa.Column("reason",      sa.Enum("spam","fake_review","offensive","wrong_website","other", name="flagreason"), nullable=False, server_default="other"),
        sa.Column("notes",       sa.Text,    nullable=True),
        sa.Column("status",      sa.Enum("open","resolved","ignored", name="flagstatus"), nullable=False, server_default="open"),
        sa.Column("resolved_by", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",  sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("review_id", "flagger_id", name="uq_flag_user_review"),
        sa.UniqueConstraint("review_id", "flagger_ip", name="uq_flag_ip_review"),
    )
    op.create_index("ix_flags_review", "moderation_flags", ["review_id"])
    op.create_index("ix_flags_status", "moderation_flags", ["status"])

    # ── WATCHLISTS ────────────────────────────────────────
    op.create_table("watchlists",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("user_id",             sa.Integer, sa.ForeignKey("users.id",    ondelete="CASCADE"), nullable=False),
        sa.Column("website_id",          sa.Integer, sa.ForeignKey("websites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notify_new_reports",  sa.Boolean, nullable=False, server_default="true"),
        sa.Column("notify_new_reviews",  sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at",          sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "website_id", name="uq_watchlist_user_website"),
    )
    op.create_index("ix_watchlists_user",    "watchlists", ["user_id"])
    op.create_index("ix_watchlists_website", "watchlists", ["website_id"])

    # ── SEARCH USAGE LIMITS ───────────────────────────────
    op.create_table("search_usage_limits",
        sa.Column("id",           sa.Integer, primary_key=True),
        sa.Column("ip_address",   sa.String(45), nullable=False),
        sa.Column("search_count", sa.Integer,    nullable=False, server_default="1"),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",   sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_search_limits_ip",     "search_usage_limits", ["ip_address"])
    op.create_index("ix_search_limits_window", "search_usage_limits", ["window_start"])


def downgrade() -> None:
    op.drop_table("search_usage_limits")
    op.drop_table("watchlists")
    op.drop_table("moderation_flags")
    op.drop_table("proof_uploads")
    op.drop_table("scam_reports")
    op.drop_table("helpful_votes")
    op.drop_table("reviews")
    op.drop_table("websites")
    op.drop_table("users")
    # Drop enum types
    for t in ["flagstatus","flagreason","issuetype","reportstatus",
              "reviewstatus","reviewtype","confidencelevel","trustlevel"]:
        op.execute(f"DROP TYPE IF EXISTS {t}")
