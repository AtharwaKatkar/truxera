# MongoDB → PostgreSQL Migration Guide

## Why PostgreSQL

| Concern | MongoDB | PostgreSQL |
|---|---|---|
| Relational joins (user→review→website) | Manual | Native |
| Unique constraints (one review per user per site) | Application-level | DB-enforced |
| Aggregations (avg rating, count by type) | Slow `$group` pipelines | Fast `GROUP BY` |
| Transactions (review + aggregate update) | Limited | Full ACID |
| Enum validation | None | Native enum types |
| Admin queries | Complex | Simple SQL |

## What Stays in MongoDB

Raw external API data that has no fixed schema:
- WHOIS raw response
- Google Safe Browsing raw response  
- Scraper raw output

These are still fetched and cached in MongoDB (or Redis).
Only the **derived signals** (domain_age_days, is_blacklisted, etc.) move to PostgreSQL.

---

## Production Stack

```
PostgreSQL 15+    — primary relational database
Redis 7+          — search quota, trust score cache, rate limiting
MongoDB           — raw API response cache (optional, can use Redis instead)
FastAPI           — backend API
React             — frontend
S3 / Cloudinary   — proof file uploads
```

---

## Setup Steps

### 1. Install PostgreSQL
```bash
# Windows: download from postgresql.org
# Or use Docker:
docker run -d --name truxera-pg \
  -e POSTGRES_USER=truxera \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=truxera \
  -p 5432:5432 postgres:15
```

### 2. Install Redis
```bash
docker run -d --name truxera-redis -p 6379:6379 redis:7
```

### 3. Update .env
```
DATABASE_URL=postgresql+asyncpg://truxera:password@localhost:5432/truxera
REDIS_URL=redis://localhost:6379/0
MONGO_URL=mongodb+srv://...  # keep for raw API cache
```

### 4. Install Python dependencies
```bash
py -3.11 -m pip install sqlmodel asyncpg alembic psycopg2-binary "redis[asyncio]"
```

### 5. Run migrations
```bash
py -3.11 -m alembic upgrade head
```

### 6. Migrate existing MongoDB data
```bash
py -3.11 migrate_mongo_to_pg.py
```

---

## Alembic Workflow

```bash
# Create new migration after model change
py -3.11 -m alembic revision --autogenerate -m "add watchlist notifications"

# Apply migrations
py -3.11 -m alembic upgrade head

# Rollback one step
py -3.11 -m alembic downgrade -1

# Check current version
py -3.11 -m alembic current
```

---

## Computed vs Stored Fields

| Field | Strategy | Why |
|---|---|---|
| `average_rating` | **Stored**, refreshed on write | Fast reads, no aggregation on every request |
| `trust_score` | **Stored**, refreshed on write | Expensive to compute, changes rarely |
| `reviews_count` | **Stored**, incremented on write | Avoid COUNT(*) on every page load |
| `reports_count` | **Stored**, incremented on write | Same |
| `helpful_votes_count` | **Stored** on Review row | Fast sort by helpfulness |
| `flags_count` | **Stored** on Review row | Fast moderation queue ordering |
| `confidence` | **Stored**, refreshed with trust score | Derived from signal count |
| `risk_reasons` | **Stored** as TEXT[] | Fast display, no recomputation |
| `rating_1..5` | **Stored** on Website | Fast distribution bar rendering |
| `positive_pct` | **Computed** at read time | Simple division, not worth storing |

---

## Key Indexes

```sql
-- Fast domain lookup (most common query)
CREATE UNIQUE INDEX ix_websites_domain ON websites(domain);

-- Homepage feed: most reported
CREATE INDEX ix_websites_reports_count ON websites(reports_count DESC);

-- Review page: approved reviews for a domain, newest first
CREATE INDEX ix_reviews_website_status ON reviews(website_id, status);
CREATE INDEX ix_reviews_website_created ON reviews(website_id, created_at DESC);

-- Moderation queue: worst spam first
CREATE INDEX ix_reviews_spam ON reviews(spam_score DESC);

-- Helpful sort
CREATE INDEX ix_reviews_helpful ON reviews(helpful_votes_count DESC);

-- Duplicate prevention
CREATE UNIQUE INDEX uq_review_user_website ON reviews(user_id, website_id);
```
