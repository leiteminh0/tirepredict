import hashlib
import logging
from pathlib import Path

import joblib
import numpy as np

logger = logging.getLogger(__name__)

# Caminho absoluto baseado na localização deste arquivo
BASE_DIR = Path(__file__).resolve().parent
MODELO_PATH = BASE_DIR / "modelo_pneu.pkl"

# SHA-256 do artefato no momento em que foi commitado.
# Atualize este valor sempre que retreinar e substituir o modelo.
# Para gerar: python -c "import hashlib; print(hashlib.sha256(open('backend/modelo_pneu.pkl','rb').read()).hexdigest())"
_MODELO_SHA256_ESPERADO = "2865c5c3bc521ef959bc9aeb2686f59772b875011d83b57ea02fc0bab48cf445"


class ModeloIndisponivelError(RuntimeError):
    """O artefato ML nao pode atender predicoes no momento."""


class ModeloCorrompidoError(RuntimeError):
    """O hash do artefato ML nao corresponde ao esperado — possivel substituicao acidental."""


def _verificar_integridade() -> None:
    """Valida o SHA-256 do arquivo antes de deserializar."""
    sha = hashlib.sha256(MODELO_PATH.read_bytes()).hexdigest()
    if sha != _MODELO_SHA256_ESPERADO:
        raise ModeloCorrompidoError(
            f"Hash do modelo divergente. Esperado={_MODELO_SHA256_ESPERADO} Encontrado={sha}. "
            "Se o modelo foi retreinado, atualize _MODELO_SHA256_ESPERADO em predicao.py."
        )
    logger.info("model_integrity=ok sha256=%s", sha)


def carregar_modelo():
    """Carrega o artefato explicitamente durante o ciclo de vida da aplicacao."""
    _verificar_integridade()
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

    nivel = str(predicao).upper()
    return {
        "nivel": nivel,
        "probabilidade": round(probabilidade_max, 2),
        "acao_recomendada": acoes.get(nivel, "Monitorar o pneu e validar a classificacao."),
    }
