# TirePredict

Sistema de monitoramento preditivo de pressão de pneus agrícolas. Sensores ESP32 enviam telemetria por MQTT; o backend FastAPI classifica o risco com Random Forest; o dashboard React exibe a frota em tempo quase real.

```
Sensor ESP32 → MQTT → FastAPI → PostgreSQL → API /frota → Dashboard React
```

---

## Subir com Docker Desktop (recomendado)

> **Pré-requisito:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando.

```bash
# 1. Clone o repositório
git clone https://github.com/leiteminh0/tirepredict.git
cd tirepredict

# 2. Suba todos os serviços
docker compose up --build

# 3. Popule o banco com máquinas e pneus de demo
curl -X POST http://localhost:8080/admin/seed \
  -H "X-Admin-Token: dev_seed_token_local"
```

Após o build (~2 min na primeira vez):

| Serviço | URL |
|---|---|
| Dashboard | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:8080](http://localhost:8080) |
| Documentação interativa | [http://localhost:8080/docs](http://localhost:8080/docs) |

Para parar: `docker compose down`. Para apagar também o banco: `docker compose down -v`.

---

## Desenvolvimento local (sem Docker)

### Backend

```powershell
# Windows
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Crie o .env a partir do exemplo
Copy-Item .env.example .env
# Edite .env e configure DATABASE_URL (SQLite local já funciona)

alembic upgrade head
python -m backend.seed
uvicorn backend.main:app --reload
```

```bash
# Linux / macOS
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
alembic upgrade head
python -m backend.seed
uvicorn backend.main:app --reload
```

API disponível em `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
# Edite .env.local: VITE_API_URL=http://localhost:8000
npm run dev
```

Dashboard disponível em `http://localhost:5173`.

---

## Variáveis de ambiente

### Backend (`.env`)

| Variável | Obrigatória em produção | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | URL PostgreSQL. Ex: `postgresql://user:pass@host/db` |
| `WRITE_API_TOKEN` | ✅ | Token para `POST /leituras` — enviar no header `X-API-Token` |
| `ADMIN_SEED_TOKEN` | Opcional | Protege `POST /admin/seed` via `X-Admin-Token` |
| `ENVIRONMENT` | Opcional | `production` ativa validações extras. Padrão: `development` |
| `ALERT_PRESSURE_THRESHOLD` | Opcional | Limiar de pressão para alertas em PSI. Padrão: `30` |
| `CORS_ORIGINS` | Opcional | Origins permitidas, separadas por vírgula |
| `MQTT_BROKER` | Opcional | Host do broker MQTT (se ausente, MQTT fica desativado) |
| `MQTT_PORT` | Opcional | Porta MQTT. Padrão: `8883` |
| `MQTT_USER` | Opcional | Usuário MQTT |
| `MQTT_PASSWORD` | Opcional | Senha MQTT |
| `MQTT_TOPIC` | Opcional | Tópico MQTT. Ex: `tirepredict/leituras` |

### Frontend (`frontend/.env.local`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | ✅ | URL base da API. Ex: `http://localhost:8080` |

---

## Endpoints principais

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | — | Estado do banco, MQTT e ML |
| GET | `/frota` | — | Frota agregada para o dashboard |
| GET | `/maquinas` | — | Máquinas cadastradas |
| GET | `/pneus/{maquina_id}` | — | Pneus de uma máquina |
| GET | `/leituras/{pneu_id}/recentes` | — | Até 100 leituras recentes |
| GET | `/alertas` | — | Leituras abaixo do limiar configurado |
| POST | `/leituras` | `X-API-Token` | Persiste telemetria manual |
| POST | `/prever` | — | Classifica risco com o modelo ML |
| POST | `/simular` | — | Simulador: grava + prevê em uma chamada |
| POST | `/admin/seed` | `X-Admin-Token` | Popula banco com dados de demo |

Exemplo de payload para `/simular`:

```json
{
  "pneu_id": 1,
  "pressao": 18.5,
  "temperatura": 68,
  "horas_uso": 2100
}
```

---

## Testes

```bash
pytest                    # suíte completa
pytest tests/test_api.py  # só integração HTTP
```

Os testes usam SQLite em memória — sem necessidade de PostgreSQL rodando.

---

## Modelo ML

O artefato `backend/modelo_pneu.pkl` é um Random Forest treinado com dataset sintético baseado em especificações técnicas ETRTO/TRA. Acurácia de 96,8% no conjunto de teste.

Para detalhes completos (dataset, métricas, matriz de confusão, hiperparâmetros): [`docs/MODELO_ML.md`](docs/MODELO_ML.md).

Para retreinar: `python docs/treinar_modelo.py`.

---

## Arquitetura

```
tirepredict/
├── backend/
│   ├── main.py            # API FastAPI, rotas e middlewares
│   ├── models.py          # ORM SQLAlchemy (Maquina, Pneu, Leitura)
│   ├── services.py        # Regras de negócio (salvar_leitura, limite_alerta)
│   ├── predicao.py        # Carregamento e inferência do modelo ML
│   ├── mqtt_subscriber.py # Subscriber MQTT com validação Pydantic
│   ├── seed.py            # Dados de demo (2 máquinas, 9 pneus)
│   ├── database.py        # Engine SQLAlchemy e sessão
│   └── modelo_pneu.pkl    # Artefato Random Forest
├── frontend/
│   └── src/
│       ├── pages/         # Frota, Dashboard, Simulador, Relatório, Alertas
│       ├── components/    # CardPneu, RiskBadge, GraficoPressao, ...
│       └── services/api.js
├── alembic/               # Migrations versionadas
├── tests/                 # Integração HTTP, serviços, ML, MQTT
├── docs/
│   ├── MODELO_ML.md       # Documentação completa do modelo
│   └── treinar_modelo.py  # Script reproduzível de treinamento
├── docker-compose.yml     # Sobe backend + frontend + PostgreSQL
├── Dockerfile.backend
└── frontend/Dockerfile.frontend
```
