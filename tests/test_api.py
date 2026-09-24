"""Testes de integração HTTP para as rotas FastAPI do TirePredict.

Usa TestClient do FastAPI com banco SQLite em memória — sem dependência de
PostgreSQL nem de variáveis de ambiente de produção.

DATABASE_URL e o engine são configurados em tests/conftest.py com StaticPool,
garantindo que todas as conexões vejam o mesmo banco em memória.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db  # engine já foi substituído pelo conftest
from backend import database as _db
from backend.main import app
from backend.models import Leitura, Maquina, Pneu

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _setup_db():
    """Limpa e recria todas as tabelas antes de cada teste para garantir isolamento."""
    Base.metadata.drop_all(bind=_db.engine)
    Base.metadata.create_all(bind=_db.engine)
    yield
    Base.metadata.drop_all(bind=_db.engine)


_SessionTest = sessionmaker(autocommit=False, autoflush=False, bind=None)


@pytest.fixture()
def db():
    # Usa o engine atual (pode ter sido substituído pelo conftest).
    session = sessionmaker(autocommit=False, autoflush=False, bind=_db.engine)()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    """TestClient com sessão de teste injetada via dependency_overrides."""
    def _get_db_override():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _get_db_override
    app.state.modelo = None
    app.state.modelo_erro = "Desabilitado em testes"
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def maquina_com_pneus(db):
    """Cria uma máquina com 2 pneus no banco de testes."""
    maquina = Maquina(nome="Trator Teste", modelo="Modelo X")
    db.add(maquina)
    db.flush()
    pneu1 = Pneu(maquina_id=maquina.id, posicao="dianteiro_esquerdo")
    pneu2 = Pneu(maquina_id=maquina.id, posicao="traseiro_direito")
    db.add_all([pneu1, pneu2])
    db.commit()
    db.refresh(pneu1)
    db.refresh(pneu2)
    return maquina, pneu1, pneu2


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

def test_health_retorna_ok_com_banco_disponivel(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["database"]["status"] == "ok"


def test_health_expoe_threshold_de_pressao(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["config"]["pressure_threshold_psi"] == 30.0


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

def test_root_retorna_status_online(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "online"


# ---------------------------------------------------------------------------
# GET /maquinas
# ---------------------------------------------------------------------------

def test_listar_maquinas_vazio(client):
    resp = client.get("/maquinas")
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_maquinas_retorna_maquinas_cadastradas(client, maquina_com_pneus):
    maquina, *_ = maquina_com_pneus
    resp = client.get("/maquinas")
    assert resp.status_code == 200
    ids = [m["id"] for m in resp.json()]
    assert maquina.id in ids


# ---------------------------------------------------------------------------
# GET /frota
# ---------------------------------------------------------------------------

def test_frota_retorna_estrutura_correta(client, maquina_com_pneus):
    maquina, pneu1, pneu2 = maquina_com_pneus
    resp = client.get("/frota")
    assert resp.status_code == 200
    frota = resp.json()
    assert len(frota) == 1
    m = frota[0]
    assert m["id"] == maquina.id
    assert len(m["pneus"]) == 2
    # Sem leituras — risco deve ter nivel definido (BAIXO ou INDISPONIVEL dependendo do modelo).
    for pneu in m["pneus"]:
        assert pneu["risco"]["nivel"] in ("BAIXO", "INDISPONIVEL", "MEDIO", "ALTO")


def test_frota_inclui_historico_apos_leitura(client, maquina_com_pneus, db):
    _, pneu1, _ = maquina_com_pneus
    db.add(Leitura(pneu_id=pneu1.id, pressao=28.5, temperatura=36.0, horas_uso=10))
    db.commit()

    resp = client.get("/frota")
    assert resp.status_code == 200
    pneus = resp.json()[0]["pneus"]
    p = next(p for p in pneus if p["id"] == pneu1.id)
    # Deve ter ao menos 1 leitura no histórico e a última com pressao 28.5.
    assert len(p["historico"]) >= 1
    assert p["ultima_leitura"]["pressao"] == 28.5


# ---------------------------------------------------------------------------
# GET /alertas
# ---------------------------------------------------------------------------

def test_alertas_retorna_vazio_sem_leituras(client):
    resp = client.get("/alertas")
    assert resp.status_code == 200
    assert resp.json() == []


def test_alertas_retorna_leitura_abaixo_do_threshold(client, maquina_com_pneus, db):
    _, pneu1, _ = maquina_com_pneus
    db.add(Leitura(pneu_id=pneu1.id, pressao=20.0, temperatura=35.0, horas_uso=5))
    db.commit()

    resp = client.get("/alertas")
    assert resp.status_code == 200
    pressoes = [a["pressao"] for a in resp.json()]
    # A leitura abaixo do threshold deve aparecer.
    assert 20.0 in pressoes


def test_alertas_nao_inclui_leitura_acima_do_threshold(client, maquina_com_pneus, db):
    _, pneu1, _ = maquina_com_pneus
    db.add(Leitura(pneu_id=pneu1.id, pressao=35.0, temperatura=35.0, horas_uso=5))
    db.commit()

    resp = client.get("/alertas")
    assert resp.status_code == 200
    assert resp.json() == []


def test_alertas_filtra_por_maquina_id(client, maquina_com_pneus, db):
    maquina, pneu1, _ = maquina_com_pneus
    # Cria segunda máquina com alerta.
    maquina2 = Maquina(nome="Outra Máquina", modelo="Y")
    db.add(maquina2)
    db.flush()
    pneu_outra = Pneu(maquina_id=maquina2.id, posicao="dianteiro_esquerdo")
    db.add(pneu_outra)
    db.flush()
    db.add(Leitura(pneu_id=pneu1.id, pressao=20.0, temperatura=35.0, horas_uso=5))
    db.add(Leitura(pneu_id=pneu_outra.id, pressao=15.0, temperatura=40.0, horas_uso=5))
    db.commit()

    resp = client.get(f"/alertas?maquina_id={maquina.id}")
    assert resp.status_code == 200
    pneu_ids = [a["pneu_id"] for a in resp.json()]
    assert pneu1.id in pneu_ids
    assert pneu_outra.id not in pneu_ids


# ---------------------------------------------------------------------------
# POST /leituras
# ---------------------------------------------------------------------------

def test_post_leituras_sem_token_em_dev_aceita(client, maquina_com_pneus):
    _, pneu1, _ = maquina_com_pneus
    resp = client.post("/leituras", json={"pneu_id": pneu1.id, "pressao": 32.0, "temperatura": 38.0, "horas_uso": 50})
    assert resp.status_code == 201
    data = resp.json()
    assert data["pressao"] == 32.0
    assert data["pneu_id"] == pneu1.id


def test_post_leituras_rejeita_pneu_inexistente(client):
    resp = client.post("/leituras", json={"pneu_id": 9999, "pressao": 32.0, "temperatura": 38.0, "horas_uso": 0})
    assert resp.status_code == 404


def test_post_leituras_rejeita_pressao_invalida(client, maquina_com_pneus):
    _, pneu1, _ = maquina_com_pneus
    resp = client.post("/leituras", json={"pneu_id": pneu1.id, "pressao": 999.0, "temperatura": 38.0, "horas_uso": 0})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /pneus/{maquina_id}
# ---------------------------------------------------------------------------

def test_pneus_retorna_404_para_maquina_inexistente(client):
    resp = client.get("/pneus/9999")
    assert resp.status_code == 404


def test_pneus_retorna_lista_da_maquina(client, maquina_com_pneus):
    maquina, pneu1, pneu2 = maquina_com_pneus
    resp = client.get(f"/pneus/{maquina.id}")
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert pneu1.id in ids
    assert pneu2.id in ids


# ---------------------------------------------------------------------------
# Correlation ID middleware
# ---------------------------------------------------------------------------

def test_resposta_contem_x_request_id(client):
    resp = client.get("/")
    assert "x-request-id" in resp.headers


def test_x_request_id_propagado_quando_enviado(client):
    resp = client.get("/", headers={"X-Request-ID": "meu-id-123"})
    assert resp.headers["x-request-id"] == "meu-id-123"
