import joblib
import numpy as np
from pathlib import Path

# Caminho absoluto baseado na localização deste arquivo
BASE_DIR = Path(__file__).resolve().parent
MODELO_PATH = BASE_DIR / "modelo_pneu.pkl"

modelo = joblib.load(MODELO_PATH)

def prever_risco(pressao: float, temperatura: float, horas_uso: float):
    entrada = np.array([[pressao, temperatura, horas_uso]])
    predicao = modelo.predict(entrada)[0]
    probabilidades = modelo.predict_proba(entrada)[0]
    probabilidade_max = float(max(probabilidades))

    acoes = {
        "BAIXO": "Pneu dentro dos parâmetros normais.",
        "MEDIO": "Monitorar o pneu nas próximas horas.",
        "ALTO": "Verificar o pneu imediatamente."
    }

    return {
        "nivel": predicao,
        "probabilidade": round(probabilidade_max, 2),
        "acao_recomendada": acoes[predicao]
    }
