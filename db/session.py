"""
db/session.py
Async PostgreSQL session factory using SQLAlchemy 2.x async engine.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://truxera:password@localhost:5432/truxera"
)

# NullPool is recommended for serverless / short-lived connections.
# For long-running servers, use pool_size=10, max_overflow=20 instead.
engine = create_async_engine(
    DATABASE_URL,
    echo=False,           # set True for SQL debug logging
    pool_pre_ping=True,   # reconnect on stale connections
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db():
    """FastAPI dependency — yields an async session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all tables (use Alembic in production instead)."""
    from db.models import SQLModel
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
