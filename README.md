# TirePredict

Monitoramento de pressão, temperatura e risco de pneus de máquinas agrícolas. O backend FastAPI recebe telemetria por MQTT ou HTTP, persiste no banco e calcula o risco com o modelo ML. O dashboard React apresenta a frota em tempo quase real.

## Arquitetura

`Sensor MQTT → FastAPI/services → PostgreSQL → API /frota → Dashboard React`

- `backend/`: API, subscriber MQTT, regras de negócio e artefato de ML.
- `frontend/`: dashboard Vite/React.
- `alembic/`: migrations versionadas do banco.
- `tests/`: testes de serviços, ML e validação MQTT.

O dashboard usa `GET /frota`: uma resposta agregada com máquinas, pneus, histórico e risco calculado no backend. Não há classificação de risco no frontend.

## Desenvolvimento

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python -m backend.seed
uvicorn backend.main:app --reload
```

Em outro terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Rode a suíte com `pytest` e o frontend com `npm run lint` e `npm run build`.

## Configuração

Copie `.env.example` para `.env`. Nunca versione esse arquivo nem segredos. Para o frontend, copie `frontend/.env.example` para `frontend/.env.local` e ajuste `VITE_API_URL`.

Em produção, `DATABASE_URL` é obrigatório e deve apontar para PostgreSQL persistente. O Railway executa `alembic upgrade head`, inicia a API e consulta `/health` como healthcheck. SQLite serve apenas para desenvolvimento local.

Variáveis importantes:

- `DATABASE_URL`: conexão PostgreSQL em produção.
- `MQTT_BROKER`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`, `MQTT_TOPIC`: conexão TLS ao broker; se ausentes, MQTT fica desativado.
- `WRITE_API_TOKEN`: obrigatório em produção para `POST /leituras`; envie-o em `X-API-Token`.
- `ADMIN_SEED_TOKEN`: protege `POST /admin/seed` via `X-Admin-Token`.
- `ALERT_PRESSURE_THRESHOLD`: limite centralizado dos alertas baseados em pressão (padrão: 30 PSI).

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Estado do banco, MQTT e ML |
| GET | `/frota` | Frota agregada para o dashboard |
| GET | `/maquinas` | Máquinas cadastradas |
| GET | `/pneus/{maquina_id}` | Pneus de uma máquina |
| GET | `/leituras/{pneu_id}/recentes` | Até 100 leituras recentes |
| GET | `/alertas` | Leituras abaixo do limite configurado |
| POST | `/leituras` | Persiste telemetria manual protegida |
| POST | `/prever` | Calcula risco com o ML |

Exemplo de leitura:

```json
{"pneu_id": 1, "pressao": 28.5, "temperatura": 36, "horas_uso": 120}
```

## Segurança operacional

Se uma credencial MQTT já foi enviada ao Git, a única correção efetiva é rotacioná-la no HiveMQ e remover o segredo do histórico remoto. Este repositório não contém uma credencial real; use exclusivamente variáveis configuradas no ambiente/deploy.

O modelo é carregado durante o startup. Uma falha nele não derruba a API: `/health` informa a indisponibilidade e `/prever` retorna HTTP 503. Consulte [a documentação do modelo](docs/MODELO_ML.md) para as limitações de reprodutibilidade.
