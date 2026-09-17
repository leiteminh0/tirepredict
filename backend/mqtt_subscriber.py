import json
import logging
import os
import ssl
from datetime import datetime, timezone
from pathlib import Path

import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError, field_validator

try:
    from .services import salvar_leitura
except ImportError:
    from services import salvar_leitura

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
logger = logging.getLogger(__name__)


class MensagemSensor(BaseModel):
    pneu_id: int
    pressao: float
    temperatura: float
    horas_uso: float = 0

    @field_validator("pneu_id")
    @classmethod
    def validar_pneu(cls, value):
        if value < 1:
            raise ValueError("pneu_id deve ser positivo")
        return value

    @field_validator("pressao")
    @classmethod
    def validar_pressao(cls, value):
        if not 0 <= value <= 250:
            raise ValueError("pressao deve estar entre 0 e 250 PSI")
        return value

    @field_validator("temperatura")
    @classmethod
    def validar_temperatura(cls, value):
        if not -80 <= value <= 200:
            raise ValueError("temperatura deve estar entre -80 e 200 C")
        return value

    @field_validator("horas_uso")
    @classmethod
    def validar_horas_uso(cls, value):
        if not 0 <= value <= 200_000:
            raise ValueError("horas_uso deve estar entre 0 e 200000")
        return value


class MQTTSubscriber:
    def __init__(self):
        self.broker = os.getenv("MQTT_BROKER")
        self.port = int(os.getenv("MQTT_PORT", "8883"))
        self.username = os.getenv("MQTT_USER")
        self.password = os.getenv("MQTT_PASSWORD")
        self.topic = os.getenv("MQTT_TOPIC")
        self.connected = False
        self.started = False
        self.last_message_at = None
        self.last_error = None
        self.client = None

    @property
    def configured(self):
        return all((self.broker, self.username, self.password, self.topic))

    def status(self):
        state = "connected" if self.connected else ("error" if self.last_error else "connecting" if self.started else "disabled")
        return {"configured": self.configured, "connected": self.connected, "state": state, "topic": self.topic, "last_message_at": self.last_message_at, "last_error": self.last_error}

    def start(self):
        if not self.configured:
            logger.warning("MQTT desativado: variaveis MQTT ausentes")
            return
        self.started = True
        # Paho 2.x recomenda a API VERSION2; em ambientes ainda com Paho 1.x
        # o enum nao existe, mas o cliente e os callbacks abaixo continuam validos.
        callback_api = getattr(mqtt, "CallbackAPIVersion", None)
        self.client = (
            mqtt.Client(callback_api_version=callback_api.VERSION2)
            if callback_api is not None
            else mqtt.Client()
        )
        self.client.username_pw_set(self.username, self.password)
        self.client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        try:
            self.client.connect_async(self.broker, self.port, keepalive=60)
            self.client.loop_start()
        except Exception as error:
            self.last_error = str(error)
            logger.exception("Nao foi possivel iniciar MQTT")

    def stop(self):
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
        self.connected = False
        self.started = False

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        if int(reason_code) == 0:
            self.connected = True
            self.last_error = None
            client.subscribe(self.topic, qos=1)
            logger.info("MQTT conectado e inscrito em %s", self.topic)
        else:
            self.connected = False
            self.last_error = f"Falha MQTT: {reason_code}"

    def _on_disconnect(self, client, userdata, *args):
        # 1.x envia apenas rc; 2.x envia disconnect_flags, reason_code e properties.
        reason_code = args[-2] if len(args) >= 2 else args[0]
        self.connected = False
        if int(reason_code) != 0:
            self.last_error = f"MQTT desconectado: {reason_code}"

    def _on_message(self, client, userdata, message):
        try:
            raw = json.loads(message.payload.decode("utf-8"))
            dados = MensagemSensor.model_validate(raw).model_dump()
            salvar_leitura(dados)
            self.last_message_at = datetime.now(timezone.utc).isoformat()
            self.last_error = None
        except (UnicodeDecodeError, json.JSONDecodeError, ValidationError, ValueError) as error:
            self.last_error = f"Mensagem MQTT recusada: {error}"
            logger.warning("%s", self.last_error)
        except Exception as error:
            self.last_error = f"Erro ao salvar mensagem MQTT: {error}"
            logger.exception("Erro ao processar MQTT")


subscriber = MQTTSubscriber()

if __name__ == "__main__":
    if not subscriber.configured:
        raise SystemExit("Variaveis MQTT_BROKER, MQTT_USER, MQTT_PASSWORD e MQTT_TOPIC sao obrigatorias.")
    subscriber.start()
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        subscriber.stop()
