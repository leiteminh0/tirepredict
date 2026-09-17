import pytest
from pydantic import ValidationError

from backend.mqtt_subscriber import MensagemSensor


def test_mensagem_sensor_rejeita_pressao_fora_do_intervalo():
    with pytest.raises(ValidationError):
        MensagemSensor.model_validate({"pneu_id": 1, "pressao": 251, "temperatura": 30})


def test_mensagem_sensor_aceita_horas_de_uso():
    assert MensagemSensor.model_validate({"pneu_id": 1, "pressao": 30, "temperatura": 30, "horas_uso": 42}).horas_uso == 42
