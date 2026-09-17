import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _database_url() -> str:
    default_path = Path(__file__).resolve().parents[1] / "tirepredict.db"
    url = os.getenv("DATABASE_URL", f"sqlite:///{default_path.as_posix()}")
    return url.replace("postgres://", "postgresql://", 1) if url.startswith("postgres://") else url


DATABASE_URL = _database_url()
_is_sqlite = DATABASE_URL.startswith("sqlite")
engine_options = {"pool_pre_ping": True}
if _is_sqlite:
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    engine_options.update(
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
    )

engine = create_engine(DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

