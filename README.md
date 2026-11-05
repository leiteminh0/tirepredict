# TirePredict

Sistema de monitoramento de risco em pneus agrícolas. Sensores ESP32 enviam telemetria por MQTT; o backend FastAPI classifica a **leitura atual** em BAIXO/MEDIO/ALTO com Random Forest — não projeta o futuro; o dashboard React exibe a frota com **atualização periódica por consulta à API** (um ciclo a cada 5 s, com backoff de até 60 s em caso de erro).

```
Sensor ESP32 → MQTT → FastAPI → PostgreSQL → API /frota → Dashboard React
```

---

## Subir com Docker Desktop (recomendado)

> **Pré-requisito:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando.

### 1. Crie o `.env` antes de subir

O `docker-compose.yml` não guarda credenciais: ele interpola `${VAR}` a partir do arquivo `.env`, que não é versionado.

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```

```bash
# Linux / macOS
cp .env.example .env
```

Edite o `.env` e defina, no mínimo:

| Variável | Para que serve |
|---|---|
| `POSTGRES_PASSWORD` | Senha do PostgreSQL local. **Obrigatória** — sem ela o compose aborta |
| `WRITE_API_TOKEN` | Token das rotas de escrita (`POST /leituras` e `POST /simular`) |
| `ADMIN_SEED_TOKEN` | Habilita `POST /admin/seed`. Se ficar vazio, a rota responde `404` |

O compose aborta com mensagem explícita quando `POSTGRES_PASSWORD` ou `WRITE_API_TOKEN` estão ausentes, em vez de subir com credencial padrão.

> **Volume já existente:** o PostgreSQL só aplica `POSTGRES_PASSWORD` na primeira inicialização do volume `postgres_data`. Se você já subiu o projeto antes, coloque em `.env` a **mesma senha** com que o volume foi criado — ou apague o volume com `docker compose down -v` (isso apaga os dados) e suba de novo.
>
> Evite `@`, `:` e `/` na senha: ela é embutida na `DATABASE_URL` montada pelo compose.

### 2. Suba os serviços

```bash
git clone https://github.com/leiteminh0/tirepredict.git
cd tirepredict
docker compose up --build
```

### 3. Popule o banco com máquinas e pneus de demo

```bash
curl -X POST http://localhost:8080/admin/seed \
  -H "X-Admin-Token: $ADMIN_SEED_TOKEN"
```

`$ADMIN_SEED_TOKEN` é o valor que você definiu no `.env`. No PowerShell, use `$env:ADMIN_SEED_TOKEN`.

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
| `POSTGRES_DB` | Opcional | Nome do banco criado pelo Compose. Padrão: `tirepredict` |
| `POSTGRES_USER` | Opcional | Usuário do Postgres no Compose. Padrão: `tirepredict` |
| `POSTGRES_PASSWORD` | ✅ (Docker) | Senha do Postgres local e da `DATABASE_URL` montada pelo Compose |
| `WRITE_API_TOKEN` | ✅ | Token de escrita para `POST /leituras` e `POST /simular` — enviar no header `X-API-Token` |
| `ADMIN_SEED_TOKEN` | Opcional | Protege `POST /admin/seed` via `X-Admin-Token` |
| `ENVIRONMENT` | Opcional | `production` ativa validações extras. Padrão: `development` |
| `ALERT_PRESSURE_THRESHOLD` | Opcional | Limiar de pressão para alertas em PSI. Padrão: `30` |
| `TELEMETRIA_VALIDADE_SEGUNDOS` | Opcional | Janela em segundos em que a leitura ainda representa o estado atual; acima disso o painel marca "Sem sinal". Padrão: `120` |
| `CORS_ORIGINS` | Opcional | Origins permitidas, separadas por vírgula |
| `MQTT_BROKER` | Opcional | Host do broker MQTT (se ausente, MQTT fica desativado) |
| `MQTT_PORT` | Opcional | Porta MQTT. Padrão: `8883` |
| `MQTT_TLS` | Opcional | `true`/`false` para TLS na conexão MQTT. Padrão: `true` |
| `MQTT_USER` | Opcional | Usuário MQTT |
| `MQTT_PASSWORD` | Opcional | Senha MQTT |
| `MQTT_TOPIC` | Opcional | Tópico MQTT. Ex: `tirepredict/leituras` |
| `DB_POOL_SIZE` | Opcional | Conexões fixas no pool do PostgreSQL. Padrão: `10` |
| `DB_MAX_OVERFLOW` | Opcional | Conexões extras acima do pool. Padrão: `20` |
| `DB_POOL_RECYCLE` | Opcional | Reciclagem de conexão, em segundos. Padrão: `1800` |

### Frontend (`frontend/.env.local`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | ✅ | URL base da API. Ex: `http://localhost:8080` |

### Segredos

- `.env` nunca é versionado (está no `.gitignore`); use `.env.example` como modelo, com valores falsos.
- No Docker, `POSTGRES_PASSWORD` e `WRITE_API_TOKEN` são obrigatórias no `.env`; `ADMIN_SEED_TOKEN` é opcional.
- Nunca coloque segredo em `VITE_*`: essas variáveis são embutidas no bundle público.
- Se um segredo já foi para o Git, trocá-lo no arquivo atual **não** limpa o histórico. O correto é rotacionar o valor na origem (HiveMQ, Railway) e depois limpar o histórico com `git filter-repo` ou BFG.

---

## Endpoints principais

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/` | — | Identificação do serviço e estado do MQTT |
| GET | `/health` | — | Estado do banco, MQTT e ML. Responde `503` se o banco não responder |
| GET | `/frota` | — | Frota agregada; cada pneu inclui `segundos_desde_ultima_leitura` (`null` se nunca houve leitura) |
| GET | `/maquinas` | — | Máquinas cadastradas |
| GET | `/pneus/{maquina_id}` | — | Pneus de uma máquina (`404` se a máquina não existe) |
| GET | `/leituras/{pneu_id}/recentes` | — | Até 100 leituras recentes |
| GET | `/alertas` | — | Leituras abaixo do limiar. Aceita `?maquina_id=N` |
| POST | `/leituras` | `X-API-Token` | Persiste telemetria manual |
| POST | `/prever` | — | Classifica risco com o modelo ML (não grava nada) |
| POST | `/simular` | `X-API-Token` | Simulador: grava + prevê em uma chamada |
| POST | `/admin/seed` | `X-Admin-Token` | Popula banco com dados de demo. Responde `404` se `ADMIN_SEED_TOKEN` não estiver configurado |

**Tokens por rota:**

- **Nenhuma rota `GET` exige token** (`/`, `/health`, `/frota`, `/maquinas`, `/pneus/*`, `/leituras/*`, `/alertas`).
- `POST /leituras` e `POST /simular` exigem o header **`X-API-Token`**, comparado com a variável `WRITE_API_TOKEN`. Sem a variável configurada e fora de produção, a escrita fica liberada; em `ENVIRONMENT=production` sem a variável, a resposta é `503`.
- `POST /admin/seed` exige o header **`X-Admin-Token`**, comparado com `ADMIN_SEED_TOKEN`.
- `POST /prever` não exige token porque não grava nada.

Exemplo de payload para `/simular`:

```json
{
  "pneu_id": 1,
  "pressao": 18.5,
  "temperatura": 68,
  "horas_uso": 2100
}
```

### Autenticação do simulador

`POST /leituras` e `POST /simular` são rotas de escrita e exigem o header `X-API-Token` sempre que
`WRITE_API_TOKEN` estiver configurado no servidor. Em desenvolvimento, sem essa variável, a escrita
fica liberada; com `ENVIRONMENT=production` e sem o token configurado, a API responde `503` e não
grava nada.

O token **não** chega ao navegador pelo bundle. O operador informa o valor na tela
**Simulador → Acesso de escrita**; o valor fica apenas em `sessionStorage` (sobrevive a um F5,
desaparece ao fechar a aba) e é enviado no header `X-API-Token`. Nunca declare o token em variável
`VITE_*`: tudo que começa com `VITE_` é embutido no JavaScript público, e qualquer visitante lê o
segredo no bundle.

```bash
curl -X POST http://localhost:8080/simular \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $WRITE_API_TOKEN" \
  -d '{"pneu_id":1,"pressao":18.5,"temperatura":68,"horas_uso":2100}'
```

Respostas: `201` leitura gravada, `401` token ausente ou inválido, `503` servidor sem
`WRITE_API_TOKEN` configurado, `404` pneu inexistente.

---

## Testes

```bash
pytest                    # suíte completa do backend
pytest tests/test_api.py  # só integração HTTP

cd frontend
npm test                  # regras de tempo e de texto da tendência
```

Os testes do backend usam SQLite em memória — sem necessidade de PostgreSQL rodando.

Os do frontend rodam no Vitest, em ambiente Node (sem navegador): cobrem `src/utils/tempo.js`
(fuso, idade relativa, rótulo do eixo ao cruzar dias) e `src/utils/tendencia.js` (texto da
tendência no card e no gráfico). São as duas regras que o `vite build` não valida.

---

## Modelo ML

O artefato `backend/modelo_pneu.pkl` é um Random Forest treinado com dataset sintético baseado em especificações técnicas ETRTO/TRA. A acurácia de **96,8% foi medida apenas no conjunto de teste sintético** e **não comprova desempenho com sensores reais** em campo.

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
