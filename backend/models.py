from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

try:
    from .database import Base
except ImportError:
    from database import Base


class Maquina(Base):
    __tablename__ = "maquinas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    modelo: Mapped[str] = mapped_column(String(120), nullable=False)
    pneus: Mapped[list["Pneu"]] = relationship(back_populates="maquina", cascade="all, delete-orphan")


class Pneu(Base):
    __tablename__ = "pneus"
    __table_args__ = (Index("ix_pneus_maquina_id", "maquina_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    maquina_id: Mapped[int] = mapped_column(ForeignKey("maquinas.id", ondelete="CASCADE"), nullable=False)
    posicao: Mapped[str] = mapped_column(String(64), nullable=False)
    maquina: Mapped[Maquina] = relationship(back_populates="pneus")
    leituras: Mapped[list["Leitura"]] = relationship(back_populates="pneu", cascade="all, delete-orphan")


class Leitura(Base):
    __tablename__ = "leituras"
    __table_args__ = (
        CheckConstraint("pressao >= 0", name="ck_leituras_pressao_positiva"),
        CheckConstraint("temperatura >= -80", name="ck_leituras_temperatura_valida"),
        Index("ix_leituras_pneu_timestamp", "pneu_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pneu_id: Mapped[int] = mapped_column(ForeignKey("pneus.id", ondelete="CASCADE"), nullable=False)
    pressao: Mapped[float] = mapped_column(Float, nullable=False)
    temperatura: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    pneu: Mapped[Pneu] = relationship(back_populates="leituras")
