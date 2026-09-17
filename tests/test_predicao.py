import pytest

from backend.predicao import ModeloIndisponivelError, prever_risco


class ModeloFalso:
    def predict(self, entrada):
        assert entrada.shape == (1, 3)
        return ["ALTO"]

    def predict_proba(self, entrada):
        return [[0.05, 0.95]]


def test_prever_risco_usa_modelo_e_retorna_acao():
    resultado = prever_risco(20, 40, 100, ModeloFalso())
    assert resultado == {"nivel": "ALTO", "probabilidade": 0.95, "acao_recomendada": "Verificar o pneu imediatamente."}


def test_prever_risco_sem_modelo_falha_de_forma_controlada():
    with pytest.raises(ModeloIndisponivelError):
        prever_risco(20, 40, 100)
