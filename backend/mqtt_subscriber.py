import json
import os
import time

import paho.mqtt.client as mqtt

try:
    from .database import salvar_leitura
except ImportError:
    from database import salvar_leitura

# MQTT broker connection is optional and configurable via environment
# variables. If MQTT_HOST is not set, the subscriber will not attempt to
# connect at all — Railway environments don't have a broker on localhost.
MQTT_HOST = os.getenv("MQTT_HOST")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_RECONNECT_DELAY = int(os.getenv("MQTT_RECONNECT_DELAY", "5"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "tirepredict/leituras")


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT] Conectado ao broker {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"[MQTT] Falha ao conectar — codigo: {rc}")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"[MQTT] Desconectado inesperadamente (codigo: {rc}). Tentando reconectar...")


def on_message(client, userdata, msg):
    try:
        dados = json.loads(msg.payload.decode())
        print(f"[MQTT] Recebido: {dados}")
        salvar_leitura(dados)
    except Exception as e:
        print(f"[MQTT] Erro ao processar mensagem: {e}")


def start_mqtt_client():
    """Starts the MQTT client with reconnect logic. Fails gracefully (returns
    without raising) if MQTT_HOST is not configured, so the app can run
    without an MQTT broker."""
    if not MQTT_HOST:
        print("[MQTT] MQTT_HOST nao configurado — subscriber desativado.")
        return None

    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message

    # paho-mqtt's built-in reconnect backoff, as a safety net alongside our
    # own connect retry loop below.
    client.reconnect_delay_set(min_delay=1, max_delay=MQTT_RECONNECT_DELAY)

    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, 60)
            break
        except Exception as e:
            print(f"[MQTT] Erro ao conectar em {MQTT_HOST}:{MQTT_PORT} — {e}")
            print(f"[MQTT] Nova tentativa em {MQTT_RECONNECT_DELAY}s...")
            time.sleep(MQTT_RECONNECT_DELAY)

    return client


if __name__ == "__main__":
    mqtt_client = start_mqtt_client()
    if mqtt_client is not None:
        mqtt_client.loop_forever()
