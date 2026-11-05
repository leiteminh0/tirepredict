"""Estimativa de tendencia de pressao por regressao linear simples.

Nao e Machine Learning: e uma reta ajustada as ultimas leituras, usada para
dizer se a pressao esta caindo e em quanto tempo chegaria ao limite de alerta.

O resultado traz tambem os pontos da reta nos extremos da janela (`reta`) para
que o grafico desenhe exatamente o mesmo ajuste que o card exibe — uma unica
fonte de verdade, em PSI por hora.
"""
from datetime import datetime, timezone

import numpy as np

AMOSTRAS_PADRAO = 10
AMOSTRAS_MINIMAS = 5
# Abaixo disso (em modulo) a variacao e tratada como ruido, nao como tendencia.
LIMIAR_PSI_POR_HORA = 0.5
# Piso de base temporal: duas amostras separadas por menos que isso nao formam
# uma janela confiavel de regressao. Sem esse piso, dez leituras no mesmo minuto
# virariam "tendencia".
INTERVALO_MINIMO_SEGUNDOS = 600


def _para_utc(momento: datetime) -> datetime:
    """SQLite devolve datetimes sem timezone; o backend grava em UTC."""
    return momento if momento.tzinfo is not None else momento.replace(tzinfo=timezone.utc)


def _resultado(
    direcao: str,
    psi_por_hora: float | None,
    horas_ate_limite: float | None,
    amostras: int,
    mensagem: str,
    *,
    intervalo_horas: float | None = None,
    janela_inicio: datetime | None = None,
    janela_fim: datetime | None = None,
    reta: dict | None = None,
) -> dict:
    """Monta o contrato de resposta; todas as chaves existem em todos os casos."""
    return {
        "direcao": direcao,
        "psi_por_hora": psi_por_hora,
        "horas_ate_limite": horas_ate_limite,
        "amostras": amostras,
        "mensagem": mensagem,
        "intervalo_horas": intervalo_horas,
        "janela_inicio": janela_inicio,
        "janela_fim": janela_fim,
        "reta": reta,
    }


def estimar_tendencia(
    leituras,
    limite_psi: float,
    amostras: int = AMOSTRAS_PADRAO,
    intervalo_minimo_segundos: int = INTERVALO_MINIMO_SEGUNDOS,
) -> dict:
    """Ajusta pressao x tempo das ultimas leituras e projeta o limite.

    `leituras` e qualquer iteravel de objetos com `pneus.pressao` e
    `pneus.timestamp`. Devolve sempre as mesmas chaves, com `direcao` em
    ``queda``/``estavel``/``subida``/``indisponivel``.

    `reta` traz o valor ajustado no inicio e no fim da janela usada, para que o
    grafico desenhe a mesma reta do card sem refazer a conta.
    """
    validas = [leitura for leitura in leituras if leitura is not None]
    validas.sort(key=lambda leitura: leitura.timestamp)
    janela = validas[-amostras:]

    if len(janela) < AMOSTRAS_MINIMAS:
        return _resultado(
            "indisponivel",
            None,
            None,
            len(janela),
            f"Dados insuficientes para estimar tendência (mínimo {AMOSTRAS_MINIMAS} leituras).",
        )

    inicio = _para_utc(janela[0].timestamp)
    fim = _para_utc(janela[-1].timestamp)
    span_segundos = (fim - inicio).total_seconds()

    if span_segundos <= 0:
        return _resultado(
            "indisponivel",
            None,
            None,
            len(janela),
            "Leituras sem intervalo de tempo: não é possível calcular inclinação.",
        )

    minutos_minimos = max(1, intervalo_minimo_segundos // 60)
    if span_segundos < intervalo_minimo_segundos:
        return _resultado(
            "indisponivel",
            None,
            None,
            len(janela),
            f"Leituras próximas no tempo (menos de {minutos_minimos} min): "
            "não é possível estimar tendência.",
        )

    horas = [(_para_utc(leitura.timestamp) - inicio).total_seconds() / 3600 for leitura in janela]
    pressoes = [float(leitura.pressao) for leitura in janela]
    intervalo_horas = round(span_segundos / 3600, 3)

    inclinacao, intercepto = np.polyfit(np.array(horas), np.array(pressoes), 1)
    psi_por_hora = round(float(inclinacao), 2)
    # A reta comeca na primeira amostra da janela (horas[0] == 0).
    reta = {
        "em_inicio": round(float(intercepto), 2),
        "em_fim": round(float(intercepto + inclinacao * horas[-1]), 2),
    }
    contexto = {
        "intervalo_horas": intervalo_horas,
        "janela_inicio": inicio,
        "janela_fim": fim,
        "reta": reta,
    }
    pressao_atual = janela[-1].pressao

    if abs(psi_por_hora) < LIMIAR_PSI_POR_HORA:
        return _resultado(
            "estavel",
            psi_por_hora,
            None,
            len(janela),
            "Sem tendência de queda: pressão estável nas últimas leituras.",
            **contexto,
        )

    if psi_por_hora > 0:
        return _resultado(
            "subida",
            psi_por_hora,
            None,
            len(janela),
            "Pressão em elevação; sem tendência de queda.",
            **contexto,
        )

    if pressao_atual <= limite_psi:
        return _resultado(
            "queda",
            psi_por_hora,
            0.0,
            len(janela),
            "Pressão já abaixo do limite de alerta.",
            **contexto,
        )

    horas_ate_limite = (limite_psi - pressao_atual) / psi_por_hora
    return _resultado(
        "queda",
        psi_por_hora,
        round(float(horas_ate_limite), 1),
        len(janela),
        f"Queda de {abs(psi_por_hora):.2f} PSI/h; limite em ~{horas_ate_limite:.0f} h.",
        **contexto,
    )
