# ============================================================
#  Database Schema — Scam Reporting Platform
#  MongoDB collections using Pydantic models (FastAPI-ready)
# ============================================================

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ────────────────────────────────────────────
#  ENUMS
# ────────────────────────────────────────────

class ReportStatus(str, Enum):
    pending   = "pending"    # just submitted, not verified
    verified  = "verified"   # proof checked, legit complaint
    rejected  = "rejected"   # fake / no proof
    resolved  = "resolved"   # business refunded / fixed issue

class ScamCategory(str, Enum):
    job_portal       = "job_portal"
    online_shopping  = "online_shopping"
    education        = "education"
    freelance        = "freelance"
    investment       = "investment"
    visa_immigration = "visa_immigration"
    astrology        = "astrology"
    other            = "other"

class TrustLevel(str, Enum):
    safe       = "safe"       # score 80–100
    caution    = "caution"    # score 50–79
    risky      = "risky"      # score 20–49
    dangerous  = "dangerous"  # score 0–19


# ────────────────────────────────────────────
#  COLLECTION 1 — websites
#  One document per unique domain
# ────────────────────────────────────────────

class WhoisData(BaseModel):
    domain_age_days:    Optional[int]   = None   # age of domain in days
    registered_on:      Optional[str]   = None   # "2023-01-15"
    registrar:          Optional[str]   = None   # "GoDaddy", "Namecheap" etc
    country:            Optional[str]   = None   # registrant country
    is_private:         Optional[bool]  = None   # WHOIS privacy enabled?

class SafeBrowsingData(BaseModel):
    is_blacklisted:     bool            = False
    threat_types:       List[str]       = []     # ["MALWARE", "PHISHING"]
    last_checked:       Optional[datetime] = None

class WebsiteSchema(BaseModel):
    # identity
    domain:             str                      # "example.com" (unique, indexed)
    full_url:           Optional[str]   = None   # "https://www.example.com"
    name:               Optional[str]   = None   # display name if known

    # trust scoring  (0 – 100, lower = more dangerous)
    trust_score:        int             = 50
    trust_level:        TrustLevel      = TrustLevel.caution
    scam_category:      Optional[ScamCategory] = None

    # aggregated stats
    total_reports:      int             = 0
    total_upvotes:      int             = 0
    total_amount_lost:  float           = 0.0    # sum of all ₹ lost across reports

    # external API data
    whois:              Optional[WhoisData]         = None
    safe_browsing:      Optional[SafeBrowsingData]  = None

    # business response
    is_claimed:         bool            = False   # business paid to claim profile
    business_response:  Optional[str]   = None    # their official reply

    # meta
    created_at:         datetime        = Field(default_factory=datetime.utcnow)
    updated_at:         datetime        = Field(default_factory=datetime.utcnow)

# MongoDB indexes for `websites`:
# db.websites.createIndex({ "domain": 1 }, { unique: true })
# db.websites.createIndex({ "trust_score": 1 })
# db.websites.createIndex({ "total_reports": -1 })


# ────────────────────────────────────────────
#  COLLECTION 2 — reports
#  One document per user complaint
# ────────────────────────────────────────────

class ReportSchema(BaseModel):
    # relationships
    domain:             str                      # links to websites.domain
    user_id:            Optional[str]   = None   # links to users._id (None = anonymous)

    # complaint details
    title:              str                      # short summary "They took ₹5000 and vanished"
    description:        str                      # full story (min 50 chars)
    amount_paid:        Optional[float] = None   # ₹ amount lost
    currency:           str             = "INR"
    scam_category:      ScamCategory    = ScamCategory.other

    # proof & evidence
    proof_urls:         List[str]       = []     # screenshot URLs (Cloudinary / S3)
    transaction_id:     Optional[str]   = None   # UPI txn ID, order ID etc

    # emotion tag (your key differentiator!)
    emotion:            Optional[str]   = None   # "angry" | "sad" | "relieved" | "warning"

    # community validation
    upvotes:            int             = 0      # "this happened to me too"
    upvoted_by:         List[str]       = []     # list of user_ids who upvoted

    # moderation
    status:             ReportStatus    = ReportStatus.pending
    is_anonymous:       bool            = False
    flagged:            bool            = False  # flagged for review

    # meta
    created_at:         datetime        = Field(default_factory=datetime.utcnow)
    updated_at:         datetime        = Field(default_factory=datetime.utcnow)

# MongoDB indexes for `reports`:
# db.reports.createIndex({ "domain": 1 })
# db.reports.createIndex({ "created_at": -1 })
# db.reports.createIndex({ "upvotes": -1 })
# db.reports.createIndex({ "status": 1 })


# ────────────────────────────────────────────
#  COLLECTION 3 — users
#  People who submit reports or upvote
# ────────────────────────────────────────────

class UserSchema(BaseModel):
    # identity
    email:              EmailStr                 # unique, indexed
    username:           Optional[str]   = None   # optional display name
    is_anonymous:       bool            = False

    # auth
    hashed_password:    str                      # bcrypt hash, NEVER store plain text
    is_verified:        bool            = False  # email verified?
    is_banned:          bool            = False  # banned for fake reports

    # activity
    reports_submitted:  int             = 0
    upvotes_given:      int             = 0
    reputation:         int             = 0      # grows with verified reports

    # meta
    created_at:         datetime        = Field(default_factory=datetime.utcnow)
    last_active:        datetime        = Field(default_factory=datetime.utcnow)

# MongoDB indexes for `users`:
# db.users.createIndex({ "email": 1 }, { unique: true })


# ────────────────────────────────────────────
#  TRUST SCORE FORMULA
#  Called every time a new report is added
# ────────────────────────────────────────────

def calculate_trust_score(
    domain_age_days:    int,
    is_blacklisted:     bool,
    total_reports:      int,
    total_upvotes:      int,
    is_whois_private:   bool,
) -> int:
    score = 100

    # domain too new = suspicious
    if domain_age_days < 90:
        score -= 40
    elif domain_age_days < 180:
        score -= 20
    elif domain_age_days < 365:
        score -= 10

    # Google blacklisted = very bad
    if is_blacklisted:
        score -= 40

    # each report reduces score
    score -= min(total_reports * 5, 30)

    # community upvotes amplify the penalty
    score -= min(total_upvotes * 2, 20)

    # hiding WHOIS = slight red flag
    if is_whois_private:
        score -= 5

    return max(0, min(score, 100))  # clamp between 0 and 100
