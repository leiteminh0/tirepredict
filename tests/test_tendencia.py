"""Estimativa de tendencia por regressao linear (nao e o modelo de ML)."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from backend.tendencia import AMOSTRAS_MINIMAS, estimar_tendencia

BASE = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
LIMITE = 30.0


def _leituras(serie, intervalo_horas=1.0):
    """Cria leituras sinteticas igualmente espacadas no tempo."""
    return [
        SimpleNamespace(pressao=pressao, timestamp=BASE + timedelta(hours=indice * intervalo_horas))
        for indice, pressao in enumerate(serie)
    ]


def test_queda_constante_projeta_horas_ate_limite():
    # -2 PSI/h; da 37 ate 30 sao 3,5 h
    resultado = estimar_tendencia(_leituras([45, 43, 41, 39, 37]), limite_psi=30.0)

    assert resultado["direcao"] == "queda"
    assert resultado["psi_por_hora"] == -2.0
    assert resultado["horas_ate_limite"] == 3.5


def test_pressao_estavel_nao_projeta_limite():
    resultado = estimar_tendencia(_leituras([35, 35, 35, 35, 35]), LIMITE)

    assert resultado["direcao"] == "estavel"
    assert resultado["horas_ate_limite"] is None
    assert "estável" in resultado["mensagem"]


def test_poucas_leituras_retorna_indisponivel():
    resultado = estimar_tendencia(_leituras([40, 38, 36, 34]), LIMITE)

    assert resultado["direcao"] == "indisponivel"
    assert resultado["horas_ate_limite"] is None
    assert resultado["amostras"] == AMOSTRAS_MINIMAS - 1
    assert "insuficientes" in resultado["mensagem"]


def test_pressao_subindo_nao_tem_tendencia_de_queda():
    resultado = estimar_tendencia(_leituras([30, 32, 34, 36, 38]), LIMITE)

    assert resultado["direcao"] == "subida"
    assert resultado["horas_ate_limite"] is None
    assert "sem tendência de queda" in resultado["mensagem"]


def test_pressao_ja_abaixo_do_limite_projeta_zero():
    resultado = estimar_tendencia(_leituras([30, 28, 26, 24, 22]), LIMITE)

    assert resultado["direcao"] == "queda"
    assert resultado["horas_ate_limite"] == 0.0
