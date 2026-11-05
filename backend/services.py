"""Regras de negocio independentes da camada HTTP e do MQTT."""

import os
from collections.abc import Iterable
from datetime import datetime, timezone
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


def limite_alerta() -> float:
    """Retorna o único limite operacional de alerta configurável por ambiente."""
    try:
        value = float(os.getenv("ALERT_PRESSURE_THRESHOLD", "30"))
    except ValueError as error:
        raise RuntimeError("ALERT_PRESSURE_THRESHOLD precisa ser numérico") from error
    if value <= 0:
        raise RuntimeError("ALERT_PRESSURE_THRESHOLD precisa ser maior que zero")
    return value


def validade_telemetria_segundos() -> int:
    """Janela, em segundos, em que uma leitura ainda representa o estado atual.

    Padrao de 120 s: curto o bastante para acusar sensor parado e longo o
    suficiente para o envio manual pelo simulador nao piscar como "sem sinal".
    """
    try:
        valor = int(os.getenv("TELEMETRIA_VALIDADE_SEGUNDOS", "120"))
    except ValueError as error:
        raise RuntimeError("TELEMETRIA_VALIDADE_SEGUNDOS precisa ser inteiro") from error
    if valor <= 0:
        raise RuntimeError("TELEMETRIA_VALIDADE_SEGUNDOS precisa ser maior que zero")
    return valor


def segundos_desde_ultima_leitura(timestamp: datetime | None, agora: datetime | None = None) -> int | None:
    """Idade da leitura mais recente em segundos; ``None`` quando nunca houve leitura.

    O SQLite devolve datetimes sem timezone; nesse caso assumimos UTC, que e como
    o backend grava (`datetime.now(timezone.utc)`).
    """
    if timestamp is None:
        return None
    momento = timestamp if timestamp.tzinfo is not None else timestamp.replace(tzinfo=timezone.utc)
    referencia = agora or datetime.now(timezone.utc)
    if referencia.tzinfo is None:
        referencia = referencia.replace(tzinfo=timezone.utc)
    return max(0, int((referencia - momento).total_seconds()))


def ultimas_leituras_por_pneu(db: Session, pneus: Iterable[Pneu]) -> dict[int, Leitura]:
    """Evita N+1 ao obter a última leitura de cada pneu da frota."""
    pneu_ids = [pneu.id for pneu in pneus]
    if not pneu_ids:
        return {}
    leituras = (
        db.query(Leitura)
        .filter(Leitura.pneu_id.in_(pneu_ids))
        .order_by(Leitura.pneu_id, Leitura.timestamp.desc())
        .all()
    )
    resultado: dict[int, Leitura] = {}
    for leitura in leituras:
        resultado.setdefault(leitura.pneu_id, leitura)
    return resultado
