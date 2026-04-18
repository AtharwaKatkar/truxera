# ============================================================
#  Truxera v4 — FastAPI Backend
#  Full review + rating + trust score platform
# ============================================================

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId
import httpx, os, certifi, asyncio, hashlib
from dotenv import load_dotenv
from services.scraper import analyze_website_content_async, scrape_penalty
from services.moderation import validate_review_text, spam_score, auto_status, DUPLICATE_WINDOW_HOURS
from services.search_limit import init_quota, check_and_increment, reset_quota

load_dotenv()

# ── CONFIG ────────────────────────────────────────────────
MONGO_URL  = os.getenv("MONGO_URL",  "mongodb://localhost:27017")
DB_NAME    = os.getenv("DB_NAME",    "truxera")
SECRET_KEY = os.getenv("SECRET_KEY", "truxera-secret-key-123")
ALGORITHM  = "HS256"
TOKEN_EXP  = 60 * 24
WHOIS_KEY  = os.getenv("WHOIS_API_KEY")
GSB_KEY    = os.getenv("GOOGLE_SAFE_BROWSING_KEY")

# ── APP ───────────────────────────────────────────────────
app = FastAPI(title="Truxera API", version="4.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── DATABASE ──────────────────────────────────────────────
client = AsyncIOMotorClient(
    MONGO_URL,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=8000,
    connectTimeoutMS=15000,
    socketTimeoutMS=30000,
)
db              = client[DB_NAME]
websites        = db["websites"]
reports         = db["reports"]
reviews         = db["reviews"]
review_votes    = db["review_votes"]
mod_flags       = db["mod_flags"]
users           = db["users"]
search_quota    = db["search_quota"]

# Wire search limit service
init_quota(search_quota)

# ── AUTH ──────────────────────────────────────────────────
pwd_ctx       = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def hash_pw(pw):     return pwd_ctx.hash(pw)
def verify_pw(p, h): return pwd_ctx.verify(p, h)
def make_token(email):
    return jwt.encode({"sub": email,
                       "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXP)},
                      SECRET_KEY, algorithm=ALGORITHM)

async def current_user_or_none(token: str = Depends(oauth2_scheme)):
    if not token: return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email: return None
        return await users.find_one({"email": email})
    except JWTError:
        return None

async def require_login(token: str = Depends(oauth2_scheme)):
    user = await current_user_or_none(token)
    if not user: raise HTTPException(401, "Please log in")
    return user

def get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    return xff.split(",")[0].strip() if xff else (request.client.host or "unknown")

# ── EXTERNAL APIs ─────────────────────────────────────────
async def fetch_whois(domain: str) -> dict:
    if not WHOIS_KEY: return {}
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get("https://www.whoisxmlapi.com/whoisserver/WhoisService",
                params={"apiKey": WHOIS_KEY, "domainName": domain, "outputFormat": "JSON"})
            rec = r.json().get("WhoisRecord", {})
            created = rec.get("createdDate", "")
            age = None
            if created:
                try: age = (datetime.utcnow() - datetime.fromisoformat(created[:10])).days
                except: pass
            return {"domain_age_days": age,
                    "registrar": rec.get("registrarName") or None,
                    "is_private": "privacy" in str(rec).lower()}
    except: return {}

async def check_gsb(domain: str):
    if not GSB_KEY: return None
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GSB_KEY}",
                json={"client": {"clientId": "truxera", "clientVersion": "4.0"},
                      "threatInfo": {"threatTypes": ["MALWARE","SOCIAL_ENGINEERING","UNWANTED_SOFTWARE"],
                                     "platformTypes": ["ANY_PLATFORM"], "threatEntryTypes": ["URL"],
                                     "threatEntries": [{"url": f"https://{domain}"}]}})
            matches = r.json().get("matches", [])
            return {"flagged": bool(matches),
                    "threat_types": list({m["threatType"] for m in matches})}
    except: return None

# ── RATING AGGREGATION ────────────────────────────────────
async def get_rating_summary(domain: str) -> dict:
    """
    Aggregates real star ratings from the reviews collection.
    Returns None values when no reviews exist — never fabricates.
    """
    try:
        pipeline = [
            {"$match": {"domain": domain, "status": "approved"}},
            {"$group": {
                "_id": None,
                "total":   {"$sum": 1},
                "sum":     {"$sum": "$rating"},
                "s5": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}},
                "s4": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
                "s3": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
                "s2": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
                "s1": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}},
                "positive": {"$sum": {"$cond": [{"$eq": ["$review_type", "positive"]}, 1, 0]}},
                "negative": {"$sum": {"$cond": [{"$eq": ["$review_type", "negative"]}, 1, 0]}},
            }}
        ]
        agg = await reviews.aggregate(pipeline).to_list(1)
        if not agg:
            return {"total_reviews": 0, "average_rating": None,
                    "distribution": {"5":0,"4":0,"3":0,"2":0,"1":0},
                    "positive_count": 0, "negative_count": 0,
                    "positive_pct": None, "negative_pct": None}
        a = agg[0]
        total = a["total"]
        avg   = round(a["sum"] / total, 2) if total else None
        pos_pct = round(a["positive"] / total * 100) if total else None
        neg_pct = round(a["negative"] / total * 100) if total else None
        return {
            "total_reviews":  total,
            "average_rating": avg,
            "distribution":   {"5": a["s5"], "4": a["s4"], "3": a["s3"],
                                "2": a["s2"], "1": a["s1"]},
            "positive_count": a["positive"],
            "negative_count": a["negative"],
            "positive_pct":   pos_pct,
            "negative_pct":   neg_pct,
        }
    except: return {"total_reviews": 0, "average_rating": None,
                    "distribution": {"5":0,"4":0,"3":0,"2":0,"1":0},
                    "positive_count": 0, "negative_count": 0,
                    "positive_pct": None, "negative_pct": None}

# ── TRUST SCORE ───────────────────────────────────────────
def build_trust_result(domain, whois, gsb, scrape,
                        n_reports, n_upvotes, total_lost,
                        rating_summary: dict) -> dict:
    score   = 100
    reasons = []
    checks  = {}

    whois_available  = bool(whois)
    gsb_available    = gsb is not None
    scrape_available = scrape.get("scrape_success", False)

    # WHOIS
    if whois_available:
        age = whois.get("domain_age_days")
        if age is not None:
            checks["domain_age_days"] = age
            if age < 90:   score -= 40; reasons.append(f"Domain only {age} days old — very new")
            elif age < 180: score -= 20; reasons.append(f"Domain less than 6 months old ({age} days)")
            elif age < 365: score -= 10; reasons.append(f"Domain less than 1 year old ({age} days)")
        if whois.get("registrar"): checks["registrar"] = whois["registrar"]
        if whois.get("is_private"):
            score -= 5; checks["whois_private"] = True
            reasons.append("Domain owner identity hidden (WHOIS privacy)")

    # GSB
    if gsb_available:
        checks["google_safe_browsing_checked"] = True
        if gsb.get("flagged"):
            score -= 40; checks["google_safe_browsing_flagged"] = True
            checks["threat_types"] = gsb.get("threat_types", [])
            reasons.append("Flagged by Google Safe Browsing")
        else:
            checks["google_safe_browsing_flagged"] = False
    else:
        checks["google_safe_browsing_checked"] = False

    # Scraper
    if scrape_available:
        pen = scrape_penalty(scrape)
        score -= pen
        if not scrape.get("has_contact_page"): reasons.append("No contact page found")
        if not scrape.get("has_about_page"):   reasons.append("No about page found")
        if not scrape.get("has_privacy_page"): reasons.append("No privacy policy found")
        if scrape.get("content_length", 0) < 200: reasons.append("Website has very little content")
        kws = scrape.get("suspicious_keywords", [])
        if kws: reasons.append(f"Suspicious phrases: {', '.join(kws[:3])}")
        checks.update({
            "scrape_available": True,
            "has_contact_page": scrape.get("has_contact_page", False),
            "has_about_page":   scrape.get("has_about_page", False),
            "has_privacy_page": scrape.get("has_privacy_page", False),
            "suspicious_keywords": scrape.get("suspicious_keywords", []),
            "site_title": scrape.get("title") or None,
        })
    else:
        checks["scrape_available"] = False

    # Community reports (scam reports)
    if n_reports > 0:
        score -= min(n_reports * 5, 30)
        reasons.append(f"{n_reports} fraud report(s) from community")
    if n_upvotes > 0:
        score -= min(n_upvotes * 2, 20)

    # Rating signal (max ±15 pts, only if >= 3 reviews)
    reviews_have_data = rating_summary.get("total_reviews", 0) >= 3
    if reviews_have_data:
        avg = rating_summary["average_rating"]
        if avg is not None:
            if avg >= 4.0:   score += 10; reasons.append(f"High community rating ({avg}/5)")
            elif avg >= 3.0: pass         # neutral
            elif avg >= 2.0: score -= 10; reasons.append(f"Low community rating ({avg}/5)")
            else:            score -= 15; reasons.append(f"Very low community rating ({avg}/5)")

    score = max(0, min(score, 100))

    # Confidence
    review_signal = reviews_have_data
    signals = sum([whois_available, gsb_available, scrape_available,
                   n_reports > 0, review_signal])
    if signals == 0:       confidence = "none"
    elif signals == 1:     confidence = "low"
    elif signals == 2:     confidence = "preliminary"
    elif n_reports > 0 or review_signal: confidence = "community_backed"
    else:                  confidence = "technical"

    if score >= 80:   level = "safe"
    elif score >= 50: level = "caution"
    elif score >= 20: level = "risky"
    else:             level = "dangerous"

    return {
        "domain": domain, "trust_score": score, "trust_level": level,
        "confidence": confidence,
        "verified_checks": checks,
        "data_availability": {
            "whois": whois_available, "safe_browsing": gsb_available,
            "scrape": scrape_available, "community_reports": n_reports > 0,
            "reviews": reviews_have_data,
        },
        "reasons": reasons,
    }

def clean_domain(raw: str) -> str:
    return raw.lower().strip().replace("https://","").replace("http://","").rstrip("/").split("/")[0]

def fmt_dt(dt) -> str:
    if isinstance(dt, datetime): return dt.isoformat()
    return str(dt) if dt else ""

# ── PYDANTIC MODELS ───────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

class ReportCreate(BaseModel):
    domain: str
    title: str
    description: str
    amount_paid: Optional[float] = None
    scam_category: str = "other"
    is_anonymous: bool = False

class ReviewCreate(BaseModel):
    domain: str
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=3, max_length=120)
    review_text: str = Field(..., min_length=20, max_length=2000)
    review_type: Literal["positive", "negative", "neutral"] = "neutral"
    issue_type: Optional[str] = None
    reviewer_name: Optional[str] = None
    is_anonymous: bool = False
    used_or_paid: bool = False
    payment_successful: Optional[bool] = None
    received_service: Optional[bool] = None
    proof_urls: List[str] = []

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("Rating must be 1–5")
        return v

# ── AUTH ROUTES ───────────────────────────────────────────
@app.post("/auth/register", tags=["Auth"])
async def register(body: UserRegister):
    try:
        if await users.find_one({"email": body.email}):
            raise HTTPException(400, "Email already registered")
        await users.insert_one({
            "email": body.email, "username": body.username,
            "hashed_password": hash_pw(body.password),
            "is_banned": False, "reports_submitted": 0,
            "reviews_submitted": 0, "reputation": 0,
            "created_at": datetime.utcnow(),
        })
    except HTTPException: raise
    except Exception as e: raise HTTPException(503, f"Database unavailable: {e}")
    return {"access_token": make_token(body.email), "token_type": "bearer"}

@app.post("/auth/login", tags=["Auth"])
async def login(request: Request, form: OAuth2PasswordRequestForm = Depends()):
    try: user = await users.find_one({"email": form.username})
    except: raise HTTPException(503, "Database unavailable")
    if not user or not verify_pw(form.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")
    if user.get("is_banned"): raise HTTPException(403, "Account suspended")
    await reset_quota(request)   # clear guest search count on login
    return {"access_token": make_token(user["email"]), "token_type": "bearer"}

@app.get("/auth/me", tags=["Auth"])
async def me(user=Depends(require_login)):
    return {"email": user["email"], "username": user.get("username"),
            "reputation": user.get("reputation", 0),
            "reports_submitted": user.get("reports_submitted", 0),
            "reviews_submitted": user.get("reviews_submitted", 0)}

# ── WEBSITE CHECK ─────────────────────────────────────────
@app.get("/website/{domain}", tags=["Websites"])
async def get_website(domain: str, request: Request,
                      user=Depends(current_user_or_none)):
    domain = clean_domain(domain)

    # ── Search limit check ────────────────────────────────
    quota = await check_and_increment(request, is_logged_in=user is not None)

    whois, gsb, scrape = await asyncio.gather(
        fetch_whois(domain), check_gsb(domain),
        analyze_website_content_async(f"https://{domain}"),
    )

    n_reports, n_upvotes, total_lost = 0, 0, 0.0
    try:
        agg = await reports.aggregate([
            {"$match": {"domain": domain, "status": {"$ne": "rejected"}}},
            {"$group": {"_id": None, "count": {"$sum": 1},
                        "upvotes": {"$sum": "$upvotes"},
                        "total_lost": {"$sum": {"$ifNull": ["$amount_paid", 0]}}}}
        ]).to_list(1)
        if agg:
            n_reports  = agg[0].get("count", 0)
            n_upvotes  = agg[0].get("upvotes", 0)
            total_lost = agg[0].get("total_lost", 0.0)
    except: pass

    today_count = 0
    try:
        ts = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = await reports.count_documents(
            {"domain": domain, "created_at": {"$gte": ts}, "status": {"$ne": "rejected"}})
    except: pass

    rating_summary = await get_rating_summary(domain)
    trust = build_trust_result(domain, whois, gsb, scrape,
                                n_reports, n_upvotes, total_lost, rating_summary)

    try:
        await websites.update_one({"domain": domain},
            {"$set": {**trust, "whois_raw": whois, "gsb_raw": gsb,
                      "scrape_raw": scrape, "updated_at": datetime.utcnow()}},
            upsert=True)
    except: pass

    recent_rpts = []
    try:
        async for r in reports.find(
                {"domain": domain, "status": {"$ne": "rejected"}}
            ).sort("created_at", -1).limit(5):
            recent_rpts.append({
                "id": str(r["_id"]), "title": r["title"],
                "description": r.get("description",""),
                "amount_paid": r.get("amount_paid"),
                "scam_category": r.get("scam_category","other"),
                "upvotes": r.get("upvotes", 0),
                "is_anonymous": r.get("is_anonymous", False),
                "created_at": fmt_dt(r.get("created_at")),
            })
    except: pass

    return {
        **trust,
        "community_data": {
            "reports_count": n_reports,
            "total_loss":    total_lost if total_lost > 0 else None,
            "upvotes":       n_upvotes,
            "today_reports": today_count,
            "recent_reports": recent_rpts,
        },
        "rating_summary": rating_summary,
        "searches_remaining": quota["remaining"],  # None = unlimited (logged in)
    }

# ── REVIEWS ───────────────────────────────────────────────
@app.post("/website/{domain}/review", tags=["Reviews"])
async def submit_review(domain: str, body: ReviewCreate,
                         request: Request,
                         user=Depends(current_user_or_none)):
    domain = clean_domain(domain)

    # Content validation
    ok, err = validate_review_text(body.review_text)
    if not ok: raise HTTPException(422, err)

    ip = get_client_ip(request)
    user_id = str(user["_id"]) if user else None

    # Duplicate check — same IP or user within window
    window = datetime.utcnow() - timedelta(hours=DUPLICATE_WINDOW_HOURS)
    try:
        dup_filter = {"domain": domain, "created_at": {"$gte": window}}
        if user_id: dup_filter["$or"] = [{"ip": ip}, {"user_id": user_id}]
        else:       dup_filter["ip"] = ip
        existing = await reviews.find_one(dup_filter)
        if existing:
            raise HTTPException(429, f"You already reviewed this site in the last {DUPLICATE_WINDOW_HOURS}h.")
    except HTTPException: raise
    except: pass   # DB down — allow through

    # Spam scoring
    recent_from_ip = 0
    try:
        recent_from_ip = await reviews.count_documents(
            {"ip": ip, "created_at": {"$gte": window}})
    except: pass

    sp = spam_score(body.review_text, body.rating, ip, recent_from_ip)
    status = auto_status(sp)

    doc = {
        "domain":            domain,
        "user_id":           user_id,
        "ip":                ip,
        "rating":            body.rating,
        "title":             body.title.strip(),
        "review_text":       body.review_text.strip(),
        "review_type":       body.review_type,
        "issue_type":        body.issue_type,
        "reviewer_name":     None if body.is_anonymous else (body.reviewer_name or (user.get("username") if user else None)),
        "is_anonymous":      body.is_anonymous,
        "used_or_paid":      body.used_or_paid,
        "payment_successful":body.payment_successful,
        "received_service":  body.received_service,
        "proof_urls":        body.proof_urls,
        "helpful_votes":     0,
        "verified_flag":     len(body.proof_urls) > 0,  # pre-flag for admin review
        "spam_score":        sp,
        "status":            status,
        "created_at":        datetime.utcnow(),
        "updated_at":        datetime.utcnow(),
    }

    try:
        result = await reviews.insert_one(doc)
    except Exception as e:
        raise HTTPException(503, f"Could not save review: {e}")

    if user:
        try:
            await users.update_one({"_id": user["_id"]},
                                   {"$inc": {"reviews_submitted": 1, "reputation": 3}})
        except: pass

    return {
        "id": str(result.inserted_id),
        "status": status,
        "message": "Review submitted" if status == "pending"
                   else "Review flagged for moderation" if status == "flagged"
                   else "Review could not be published",
    }

@app.get("/website/{domain}/reviews", tags=["Reviews"])
async def get_reviews(domain: str,
                       sort: str = "newest",
                       filter: str = "all",
                       page: int = 1,
                       limit: int = 10):
    domain = clean_domain(domain)
    skip   = (page - 1) * limit

    match: dict = {"domain": domain, "status": "approved"}
    if filter == "positive":  match["review_type"] = "positive"
    elif filter == "negative": match["review_type"] = "negative"
    elif filter == "verified": match["verified_flag"] = True

    sort_field = {
        "newest":   [("created_at", -1)],
        "helpful":  [("helpful_votes", -1)],
        "highest":  [("rating", -1)],
        "lowest":   [("rating", 1)],
    }.get(sort, [("created_at", -1)])

    result = []
    total  = 0
    try:
        total = await reviews.count_documents(match)
        async for r in reviews.find(match).sort(sort_field).skip(skip).limit(limit):
            result.append({
                "id":               str(r["_id"]),
                "rating":           r["rating"],
                "title":            r["title"],
                "review_text":      r["review_text"],
                "review_type":      r["review_type"],
                "issue_type":       r.get("issue_type"),
                "reviewer_name":    r.get("reviewer_name") or "Anonymous",
                "is_anonymous":     r.get("is_anonymous", False),
                "used_or_paid":     r.get("used_or_paid", False),
                "payment_successful":r.get("payment_successful"),
                "received_service": r.get("received_service"),
                "helpful_votes":    r.get("helpful_votes", 0),
                "verified_flag":    r.get("verified_flag", False),
                "created_at":       fmt_dt(r.get("created_at")),
            })
    except: pass

    return {"reviews": result, "total": total, "page": page, "limit": limit}

@app.get("/website/{domain}/ratings-summary", tags=["Reviews"])
async def ratings_summary(domain: str):
    domain = clean_domain(domain)
    return await get_rating_summary(domain)

@app.get("/website/{domain}/community-summary", tags=["Reviews"])
async def community_summary(domain: str):
    domain = clean_domain(domain)
    rating = await get_rating_summary(domain)

    n_reports, total_lost = 0, 0.0
    try:
        agg = await reports.aggregate([
            {"$match": {"domain": domain, "status": {"$ne": "rejected"}}},
            {"$group": {"_id": None, "count": {"$sum": 1},
                        "total_lost": {"$sum": {"$ifNull": ["$amount_paid", 0]}}}}
        ]).to_list(1)
        if agg: n_reports = agg[0]["count"]; total_lost = agg[0]["total_lost"]
    except: pass

    # Top helpful positive
    top_pos = None
    try:
        r = await reviews.find_one(
            {"domain": domain, "status": "approved", "review_type": "positive"},
            sort=[("helpful_votes", -1)])
        if r: top_pos = {"title": r["title"], "review_text": r["review_text"][:200],
                          "rating": r["rating"], "helpful_votes": r.get("helpful_votes",0)}
    except: pass

    # Top helpful negative
    top_neg = None
    try:
        r = await reviews.find_one(
            {"domain": domain, "status": "approved", "review_type": "negative"},
            sort=[("helpful_votes", -1)])
        if r: top_neg = {"title": r["title"], "review_text": r["review_text"][:200],
                          "rating": r["rating"], "helpful_votes": r.get("helpful_votes",0)}
    except: pass

    total_rev = rating.get("total_reviews", 0)
    if total_rev == 0:       community_confidence = "no_reviews"
    elif total_rev < 3:      community_confidence = "low"
    elif total_rev < 10:     community_confidence = "moderate"
    else:                    community_confidence = "high"

    return {
        "domain":               domain,
        "rating_summary":       rating,
        "reports_count":        n_reports,
        "total_loss":           total_lost if total_lost > 0 else None,
        "top_positive_review":  top_pos,
        "top_negative_review":  top_neg,
        "community_confidence": community_confidence,
    }

@app.post("/review/{review_id}/helpful", tags=["Reviews"])
async def mark_helpful(review_id: str, request: Request):
    ip = get_client_ip(request)
    try:
        oid = ObjectId(review_id)
        # Prevent double-voting from same IP
        existing = await review_votes.find_one({"review_id": review_id, "ip": ip})
        if existing: raise HTTPException(429, "You already marked this review as helpful")
        await review_votes.insert_one({"review_id": review_id, "ip": ip,
                                        "created_at": datetime.utcnow()})
        await reviews.update_one({"_id": oid}, {"$inc": {"helpful_votes": 1}})
        rev = await reviews.find_one({"_id": oid})
        return {"helpful_votes": rev.get("helpful_votes", 0) if rev else 0}
    except HTTPException: raise
    except Exception as e: raise HTTPException(503, str(e))

# ── REPORTS (scam/fraud) ──────────────────────────────────
@app.get("/reports/recent", tags=["Reports"])
async def recent_reports(limit: int = 20):
    result = []
    try:
        async for r in reports.find({"status": {"$ne": "rejected"}}
                ).sort("created_at", -1).limit(limit):
            result.append({
                "id": str(r["_id"]), "domain": r["domain"], "title": r["title"],
                "amount_paid": r.get("amount_paid"),
                "scam_category": r.get("scam_category","other"),
                "upvotes": r.get("upvotes", 0),
                "created_at": fmt_dt(r.get("created_at")),
            })
    except: pass
    return result

@app.get("/websites/top", tags=["Websites"])
async def top_sites(limit: int = 10):
    result = []
    try:
        async for s in websites.find({"community_data.reports_count": {"$gt": 0}}
                ).sort("community_data.reports_count", -1).limit(limit):
            cd = s.get("community_data", {})
            result.append({
                "domain": s["domain"], "trust_score": s.get("trust_score"),
                "trust_level": s.get("trust_level"),
                "reports_count": cd.get("reports_count", 0),
                "total_loss": cd.get("total_loss"),
            })
    except: pass
    return result

@app.post("/report", tags=["Reports"])
async def create_report(body: ReportCreate, user=Depends(current_user_or_none)):
    domain = clean_domain(body.domain)
    if not domain: raise HTTPException(400, "Invalid domain")
    try:
        result = await reports.insert_one({
            "domain": domain, "user_id": str(user["_id"]) if user else None,
            "title": body.title, "description": body.description,
            "amount_paid": body.amount_paid, "scam_category": body.scam_category,
            "is_anonymous": body.is_anonymous,
            "upvotes": 0, "upvoted_by": [], "status": "pending",
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        })
    except Exception as e: raise HTTPException(503, f"Could not save report: {e}")
    if user:
        try: await users.update_one({"_id": user["_id"]},
                                     {"$inc": {"reports_submitted": 1, "reputation": 5}})
        except: pass
    return {"id": str(result.inserted_id), "message": "Report submitted successfully"}

@app.post("/report/{report_id}/upvote", tags=["Reports"])
async def upvote_report(report_id: str):
    try:
        oid = ObjectId(report_id)
        r   = await reports.find_one({"_id": oid})
        if not r: raise HTTPException(404, "Report not found")
        await reports.update_one({"_id": oid}, {"$inc": {"upvotes": 1}})
        return {"upvotes": r.get("upvotes", 0) + 1}
    except HTTPException: raise
    except Exception as e: raise HTTPException(503, str(e))

@app.get("/scrape/{domain}", tags=["Scraper"])
async def scrape_domain(domain: str):
    domain = clean_domain(domain)
    data   = await analyze_website_content_async(f"https://{domain}")
    return {**data, "penalty_applied": scrape_penalty(data)}

# ── PROOF UPLOAD ──────────────────────────────────────────
import shutil, uuid
from fastapi import UploadFile, File as FastAPIFile

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_UPLOAD_MB = 5

@app.post("/upload/proof", tags=["Uploads"])
async def upload_proof(file: UploadFile = FastAPIFile(...),
                        user=Depends(current_user_or_none)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Unsupported file type. Use JPG, PNG, WebP or PDF.")
    content = await file.read()
    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max {MAX_UPLOAD_MB}MB.")
    ext      = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    filename = f"{uuid.uuid4().hex}.{ext}"
    path     = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{filename}", "filename": filename}

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── ADMIN ROUTES ──────────────────────────────────────────
async def require_admin(token: str = Depends(oauth2_scheme)):
    user = await current_user_or_none(token)
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "Admin access required")
    return user

@app.get("/admin/stats", tags=["Admin"])
async def admin_stats(admin=Depends(require_admin)):
    try:
        return {
            "total_reviews":  await reviews.count_documents({}),
            "pending_reviews":await reviews.count_documents({"status": "pending"}),
            "flagged_reviews":await reviews.count_documents({"status": "flagged"}),
            "total_reports":  await reports.count_documents({}),
            "total_users":    await users.count_documents({}),
            "total_websites": await websites.count_documents({}),
        }
    except Exception as e:
        raise HTTPException(503, str(e))

@app.get("/admin/reviews/pending", tags=["Admin"])
async def admin_pending_reviews(limit: int = 20, admin=Depends(require_admin)):
    result = []
    try:
        async for r in reviews.find(
            {"status": {"$in": ["pending", "flagged"]}}
        ).sort("created_at", -1).limit(limit):
            result.append({
                "id":          str(r["_id"]),
                "domain":      r["domain"],
                "rating":      r["rating"],
                "title":       r["title"],
                "review_text": r["review_text"][:200],
                "review_type": r["review_type"],
                "spam_score":  r.get("spam_score", 0),
                "status":      r["status"],
                "proof_urls":  r.get("proof_urls", []),
                "ip":          r.get("ip", ""),
                "created_at":  fmt_dt(r.get("created_at")),
            })
    except Exception as e:
        raise HTTPException(503, str(e))
    return result

@app.post("/admin/review/{review_id}/approve", tags=["Admin"])
async def admin_approve_review(review_id: str, admin=Depends(require_admin)):
    try:
        await reviews.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": {"status": "approved", "verified_flag": True,
                      "updated_at": datetime.utcnow()}}
        )
        return {"message": "Review approved"}
    except Exception as e:
        raise HTTPException(503, str(e))

@app.post("/admin/review/{review_id}/reject", tags=["Admin"])
async def admin_reject_review(review_id: str, admin=Depends(require_admin)):
    try:
        await reviews.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
        )
        return {"message": "Review rejected"}
    except Exception as e:
        raise HTTPException(503, str(e))

@app.post("/review/{review_id}/report", tags=["Reviews"])
async def report_review(review_id: str, request: Request):
    """Flag a review as suspicious."""
    ip = get_client_ip(request)
    try:
        existing = await mod_flags.find_one({"target_id": review_id, "ip": ip})
        if existing:
            raise HTTPException(429, "You already reported this review")
        await mod_flags.insert_one({
            "target_id": review_id, "target_type": "review",
            "ip": ip, "created_at": datetime.utcnow()
        })
        flag_count = await mod_flags.count_documents({"target_id": review_id})
        if flag_count >= 3:
            await reviews.update_one(
                {"_id": ObjectId(review_id)},
                {"$set": {"status": "flagged"}}
            )
        return {"message": "Review reported"}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(503, str(e))

# ── TRENDING / RECENT ─────────────────────────────────────
@app.get("/websites/trending", tags=["Websites"])
async def trending_sites(limit: int = 10):
    """Sites with most reports in the last 7 days."""
    result = []
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        pipeline = [
            {"$match": {"created_at": {"$gte": week_ago}, "status": {"$ne": "rejected"}}},
            {"$group": {"_id": "$domain", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        async for doc in reports.aggregate(pipeline):
            site = await websites.find_one({"domain": doc["_id"]})
            result.append({
                "domain":       doc["_id"],
                "reports_7d":   doc["count"],
                "trust_score":  site.get("trust_score") if site else None,
                "trust_level":  site.get("trust_level") if site else None,
            })
    except: pass
    return result

@app.get("/websites/recently-reviewed", tags=["Websites"])
async def recently_reviewed(limit: int = 10):
    """Domains that received reviews most recently."""
    result = []
    try:
        async for r in reviews.find(
            {"status": "approved"}
        ).sort("created_at", -1).limit(limit * 3):
            domain = r["domain"]
            if any(x["domain"] == domain for x in result):
                continue
            site = await websites.find_one({"domain": domain})
            result.append({
                "domain":      domain,
                "trust_score": site.get("trust_score") if site else None,
                "trust_level": site.get("trust_level") if site else None,
                "last_review": fmt_dt(r.get("created_at")),
                "rating":      r.get("rating"),
            })
            if len(result) >= limit:
                break
    except: pass
    return result

# ── STARTUP ───────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    asyncio.create_task(_make_indexes())

async def _make_indexes():
    try:
        await websites.create_index("domain", unique=True)
        await reports.create_index("domain")
        await reports.create_index([("created_at", -1)])
        await reviews.create_index("domain")
        await reviews.create_index([("domain", 1), ("status", 1)])
        await reviews.create_index([("domain", 1), ("created_at", -1)])
        await reviews.create_index([("domain", 1), ("helpful_votes", -1)])
        await reviews.create_index([("ip", 1), ("domain", 1), ("created_at", -1)])
        await review_votes.create_index([("review_id", 1), ("ip", 1)], unique=True)
        await users.create_index("email", unique=True)
        await search_quota.create_index("ip", unique=True)
        await search_quota.create_index("window_start", expireAfterSeconds=86400)
        print("✓ Indexes ready")
    except Exception as e:
        print(f"Index warning: {e}")

# ── STATIC FILES ──────────────────────────────────────────
DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        # Don't serve SPA for API or upload paths
        if full_path.startswith(("api/", "uploads/", "admin/")):
            raise HTTPException(404)
        return FileResponse(os.path.join(DIST, "index.html"))
