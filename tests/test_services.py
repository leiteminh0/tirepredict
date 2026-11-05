from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import Maquina, Pneu
from backend.services import salvar_leitura, segundos_desde_ultima_leitura, validade_telemetria_segundos


def test_salvar_leitura_persiste_horas_de_uso():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    maquina = Maquina(nome="Trator", modelo="Teste")
    session.add(maquina)
    session.flush()
    pneu = Pneu(maquina_id=maquina.id, posicao="dianteiro_esquerdo")
    session.add(pneu)
    session.commit()

    leitura = salvar_leitura({"pneu_id": pneu.id, "pressao": 28, "temperatura": 35, "horas_uso": 123}, session)

    assert leitura.id is not None
    assert leitura.horas_uso == 123


def test_salvar_leitura_rejeita_pneu_inexistente():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    try:
        salvar_leitura({"pneu_id": 999, "pressao": 28, "temperatura": 35, "horas_uso": 0}, session)
    except ValueError as error:
        assert "999" in str(error)
    else:
        raise AssertionError("Uma leitura sem pneu não deve ser persistida")


# ---------------------------------------------------------------------------
# Idade da leitura e janela de validade da telemetria
# ---------------------------------------------------------------------------

def test_idade_da_leitura_em_segundos():
    agora = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)

    assert segundos_desde_ultima_leitura(agora - timedelta(seconds=300), agora) == 300


def test_sem_leitura_retorna_none():
    assert segundos_desde_ultima_leitura(None) is None


def test_data_sem_timezone_e_tratada_como_utc():
    agora = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    lida_do_sqlite = datetime(2026, 1, 1, 11, 58, 0)  # naive

    assert segundos_desde_ultima_leitura(lida_do_sqlite, agora) == 120


def test_idade_nunca_e_negativa():
    agora = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)

    assert segundos_desde_ultima_leitura(agora + timedelta(seconds=30), agora) == 0


def test_validade_padrao_e_120_segundos(monkeypatch):
    monkeypatch.delenv("TELEMETRIA_VALIDADE_SEGUNDOS", raising=False)

    assert validade_telemetria_segundos() == 120


def test_validade_respeita_variavel_de_ambiente(monkeypatch):
    monkeypatch.setenv("TELEMETRIA_VALIDADE_SEGUNDOS", "45")

    assert validade_telemetria_segundos() == 45


@pytest.mark.parametrize("invalido", ["abc", "0", "-10"])
def test_validade_rejeita_valor_invalido(monkeypatch, invalido):
    monkeypatch.setenv("TELEMETRIA_VALIDADE_SEGUNDOS", invalido)

    with pytest.raises(RuntimeError):
        validade_telemetria_segundos()

