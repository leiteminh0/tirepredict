from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tirepredict.db")

engine = create_engine(DATABASE_URL)
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
