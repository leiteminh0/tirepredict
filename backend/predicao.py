from pathlib import Path

import joblib
import numpy as np

# Caminho absoluto baseado na localização deste arquivo
BASE_DIR = Path(__file__).resolve().parent
MODELO_PATH = BASE_DIR / "modelo_pneu.pkl"

class ModeloIndisponivelError(RuntimeError):
    """O artefato ML nao pode atender predicoes no momento."""


def carregar_modelo():
    """Carrega o artefato explicitamente durante o ciclo de vida da aplicacao."""
    return joblib.load(MODELO_PATH)


def prever_risco(pressao: float, temperatura: float, horas_uso: float, modelo=None):
    if modelo is None:
        raise ModeloIndisponivelError("Modelo de previsao indisponivel")
    entrada = np.array([[pressao, temperatura, horas_uso]])
    predicao = modelo.predict(entrada)[0]
    probabilidades = modelo.predict_proba(entrada)[0]
    probabilidade_max = float(max(probabilidades))

    acoes = {
        "BAIXO": "Pneu dentro dos parâmetros normais.",
        "MEDIO": "Monitorar o pneu nas próximas horas.",
        "ALTO": "Verificar o pneu imediatamente."
    }

    nivel = str(predicao)
    return {
        "nivel": nivel,
        "probabilidade": round(probabilidade_max, 2),
        "acao_recomendada": acoes.get(nivel, "Monitorar o pneu e validar a classificacao."),
    }
