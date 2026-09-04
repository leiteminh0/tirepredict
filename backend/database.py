from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import os

# DATABASE_URL must be set in the environment for production deployments
# (e.g. a PostgreSQL connection string). Falls back to a local SQLite file
# only for local development, since SQLite is not durable across deploys.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tirepredict.db")

_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    # SQLite does not support pooling parameters like pool_size/max_overflow,
    # and needs check_same_thread disabled to work with FastAPI's threaded workers.
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Production (PostgreSQL) configuration: use a proper connection pool with
    # health checks and recycling so stale/dropped connections (e.g. after
    # network blips or provider idle timeouts) don't surface as "connection
    # lost" errors under load.
    engine = create_engine(
        DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def salvar_leitura(dados: dict):
    try:
        from .models import Leitura
    except ImportError:
        from models import Leitura
    db = SessionLocal()
    try:
        leitura = Leitura(
            pneu_id=dados["pneu_id"],
            pressao=dados["pressao"],
            temperatura=dados["temperatura"]
        )
        db.add(leitura)
        db.commit()
        db.refresh(leitura)
        return leitura
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

