from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from datetime import datetime
try:
    from .database import Base
except ImportError:
    from database import Base

class Maquina(Base):
    __tablename__ = "maquinas"
    id = Column(Integer, primary_key=True)
    nome = Column(String)
    modelo = Column(String)

class Pneu(Base):
    __tablename__ = "pneus"
    id = Column(Integer, primary_key=True)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"))
    posicao = Column(String)

class Leitura(Base):
    __tablename__ = "leituras"
    id = Column(Integer, primary_key=True)
    pneu_id = Column(Integer, ForeignKey("pneus.id"))
    pressao = Column(Float)
    temperatura = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
