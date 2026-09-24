"""Configuração global de testes — executada antes de qualquer import do projeto.

Define DATABASE_URL como sqlite:///:memory: com StaticPool para que todas as
conexões SQLAlchemy compartilhem a mesma instância em memória durante os testes.
"""
import os

# Deve estar ANTES de qualquer import de backend.*
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("ALERT_PRESSURE_THRESHOLD", "30")

# Monkey-patch do engine APÓS os envs serem definidos para garantir StaticPool.
# Sem isso, cada chamada a engine.connect() cria uma nova instância SQLite em
# memória — tabelas criadas por _setup_db ficam invisíveis para o app.
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from backend import database as _db

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_db.engine = _test_engine
_db.SessionLocal.configure(bind=_test_engine)
