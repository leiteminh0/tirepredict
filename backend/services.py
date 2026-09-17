"""Regras de negocio independentes da camada HTTP e do MQTT."""

from typing import Any

from sqlalchemy.orm import Session

try:
    from .database import SessionLocal
    from .models import Leitura, Pneu
except ImportError:
    from database import SessionLocal
    from models import Leitura, Pneu


def salvar_leitura(dados: dict[str, Any], db: Session | None = None) -> Leitura:
    """Persiste uma leitura de forma atomica e confirma que o pneu existe."""
    session = db or SessionLocal()
    try:
        if session.get(Pneu, dados["pneu_id"]) is None:
            raise ValueError(f"Pneu {dados['pneu_id']} nao encontrado")
        leitura = Leitura(**dados)
        session.add(leitura)
        session.commit()
        session.refresh(leitura)
        return leitura
    except Exception:
        session.rollback()
        raise
    finally:
        if db is None:
            session.close()
