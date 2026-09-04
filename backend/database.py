from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tirepredict.db")

_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    # Local dev: SQLite sem pooling (não suporta)
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False},
    )
else:
    # Production (PostgreSQL): Pool robusto com health checks
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
