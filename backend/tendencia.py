"""Estimativa de tendencia de pressao por regressao linear simples.

Nao e Machine Learning: e uma reta ajustada as ultimas leituras, usada para
dizer se a pressao esta caindo e em quanto tempo chegaria ao limite de alerta.
"""
from datetime import datetime, timezone

import numpy as np

AMOSTRAS_PADRAO = 10
AMOSTRAS_MINIMAS = 5
# Abaixo disso (em modulo) a variacao e tratada como ruido, nao como tendencia.
LIMIAR_PSI_POR_HORA = 0.5


def _para_utc(momento: datetime) -> datetime:
    """SQLite devolve datetimes sem timezone; o backend grava em UTC."""
    return momento if momento.tzinfo is not None else momento.replace(tzinfo=timezone.utc)


def _resultado(direcao: str, psi_por_hora: float | None, horas_ate_limite: float | None, amostras: int, mensagem: str) -> dict:
    return {
        "direcao": direcao,
        "psi_por_hora": psi_por_hora,
        "horas_ate_limite": horas_ate_limite,
        "amostras": amostras,
        "mensagem": mensagem,
    }


def estimar_tendencia(leituras, limite_psi: float, amostras: int = AMOSTRAS_PADRAO) -> dict:
    """Ajusta pressao x tempo das ultimas leituras e projeta o limite.

    `leituras` e qualquer iteravel de objetos com `.pressao` e `.timestamp`.
    Devolve sempre as mesmas chaves, com `direcao` em
    ``queda``/``estavel``/``subida``/``indisponivel``.
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
    horas = [(_para_utc(leitura.timestamp) - inicio).total_seconds() / 3600 for leitura in janela]
    pressoes = [float(leitura.pressao) for leitura in janela]

    if horas[-1] <= 0:
        return _resultado(
            "indisponivel",
            None,
            None,
            len(janela),
            "Leituras sem intervalo de tempo: não é possível calcular inclinação.",
        )

    inclinacao, _intercepto = np.polyfit(np.array(horas), np.array(pressoes), 1)
    psi_por_hora = round(float(inclinacao), 2)
    pressao_atual = validas[-1].pressao

    if abs(psi_por_hora) < LIMIAR_PSI_POR_HORA:
        return _resultado(
            "estavel",
            psi_por_hora,
            None,
            len(janela),
            "Sem tendência de queda: pressão estável nas últimas leituras.",
        )

    if psi_por_hora > 0:
        return _resultado(
            "subida",
            psi_por_hora,
            None,
            len(janela),
            "Pressão em elevação; sem tendência de queda.",
        )

    if pressao_atual <= limite_psi:
        return _resultado(
            "queda",
            psi_por_hora,
            0.0,
            len(janela),
            "Pressão já abaixo do limite de alerta.",
        )

    horas_ate_limite = (limite_psi - pressao_atual) / psi_por_hora
    return _resultado(
        "queda",
        psi_por_hora,
        round(float(horas_ate_limite), 1),
        len(janela),
        f"Queda de {abs(psi_por_hora):.2f} PSI/h; limite em ~{horas_ate_limite:.0f} h.",
    )
