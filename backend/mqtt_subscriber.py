import paho.mqtt.client as mqtt
import json
try:
    from .database import salvar_leitura
except ImportError:
    from database import salvar_leitura

def on_connect(client, userdata, flags, rc):
    print(f"Conectado ao broker MQTT — codigo: {rc}")
    client.subscribe("tirepredict/leituras")

def on_message(client, userdata, msg):
    try:
        dados = json.loads(msg.payload.decode())
        print(f"[MQTT] Recebido: {dados}")
        salvar_leitura(dados)
    except Exception as e:
        print(f"[MQTT] Erro ao processar mensagem: {e}")

if __name__ == "__main__":
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect("localhost", 1883, 60)
    client.loop_forever()
