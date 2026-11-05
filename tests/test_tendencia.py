"""Estimativa de tendencia por regressao linear (nao e o modelo de ML)."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from backend.tendencia import AMOSTRAS_MINIMAS, INTERVALO_MINIMO_SEGUNDOS, estimar_tendencia

BASE = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
LIMITE = 30.0


def _leituras(serie, intervalo_horas=1.0):
    """Cria leituras sinteticas igualmente espacadas no tempo."""
    return [
        Leitura(pressao, inicio=BASE + timedelta(hours=indice * intervalo_horas))
        for indice, pressao in enumerate(serie)
    ]


class Leitura(SimpleNamespace):
    """Leitura minima: o estimador so usa `.pressao` e `.timestamp`."""

    def __init__(self, pressao, inicio):
        super().__init__(pressao=pressao, timestamp=inicio)


def test_queda_constante_projeta_horas_ate_limite():
    # -2 PSI/h; de 37 ate 30 sao 3.5 h
    resultado = estimar_tendencia(_leituras([45, 43, 41, 39, 37]), LIMITE)

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


# ---------------------------------------------------------------------------
# Janela: piso de intervalo minimo
# ---------------------------------------------------------------------------

def test_leituras_no_mesmo_minuto_retorna_indisponivel():
    """Seis leituras em 30 s nao formam base temporal para regressao."""
    leituras = _leituras([40, 39, 38, 37, 36, 35], intervalo_horas=30 / 3600)

    resultado = estimar_tendencia(leituras, LIMITE)

    assert resultado["direcao"] == "indisponivel"
    assert "próximas no tempo" in resultado["mensagem"]
    assert resultado["reta"] is None
    assert resultado["janela_inicio"] is None


def test_span_exatamente_no_limite_minimo_e_aceito():
    """Quatro intervalos de 150 s = 600 s = exatamente o piso configurado."""
    leituras = _leituras([45, 43, 41, 39, 37], intervalo_horas=150 / 3600)

    resultado = estimar_tendencia(leituras, LIMITE)

    assert INTERVALO_MINIMO_SEGUNDOS == 600
    assert resultado["direcao"] == "queda"
    assert resultado["intervalo_horas"] == 0.167


# ---------------------------------------------------------------------------
# Reta e janela expostas para o grafico
# ---------------------------------------------------------------------------

def test_reta_ancora_nos_extremos_da_janela():
    resultado = estimar_tendencia(_leituras([45, 43, 41, 39, 37]), LIMITE)

    assert resultado["reta"] == {"em_inicio": 45.0, "em_fim": 37.0}
    assert resultado["intervalo_horas"] == 4.0
    assert resultado["janela_inicio"] == BASE
    assert resultado["janela_fim"] == BASE + timedelta(hours=4)


def test_janela_usa_apenas_as_dez_leituras_mais_recentes():
    """Quinze leituras horarias: a reta comeca na sexta, nao na primeira."""
    leituras = _leituras(list(range(60, 45, -1)))

    resultado = estimar_tendencia(leituras, LIMITE)

    assert resultado["amostras"] == 10
    assert resultado["janela_inicio"] == BASE + timedelta(hours=5)
    assert resultado["janela_fim"] == BASE + timedelta(hours=14)
    assert resultado["reta"] == {"em_inicio": 55.0, "em_fim": 46.0}


def test_indisponivel_nao_tem_reta_nem_janela():
    resultado = estimar_tendencia(_leituras([40, 38, 36]), LIMITE)

    assert resultado["reta"] is None
    assert resultado["janela_inicio"] is None
    assert resultado["janela_fim"] is None
    assert resultado["intervalo_horas"] is None
