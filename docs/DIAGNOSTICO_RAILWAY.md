# Diagnóstico do Railway — TirePredict

Guia para responder três perguntas na ordem certa:

1. O deploy passou? (build e release)
2. O processo está vivo e ouvindo? (start, porta, healthcheck)
3. A aplicação funciona de verdade? (rotas que leem dados)

A pergunta 3 é a que mais engana neste projeto: o healthcheck aprova o serviço mesmo quando o schema do banco está errado. Hoje a produção responde `200` em `/health` e `500` em `/frota`.

---

## 1. Quem é quem na sua infraestrutura

| Peça | Como sobe | Onde ver | Sinal de vida |
| --- | --- | --- | --- |
| `api` | Nixpacks, lendo [`railway.toml`](../railway.toml): `preDeployCommand = "alembic upgrade head"`, `startCommand = uvicorn ... --port $PORT` | Deployments, Logs | `GET /health` → `200` com `database.status=ok` |
| `Postgres` | Plugin gerenciado pelo Railway | Aba **Data** (editor SQL) e Metrics | `alembic_version` com revisão esperada |
| `frontend` | [`frontend/Dockerfile.frontend`](../frontend/Dockerfile.frontend) (`serve -s dist -l 3000`) — **se** estiver publicado como serviço | Deployments | Página abre e chama a API |

Confirme qual domínio responde o quê antes de qualquer coisa:

```powershell
$base = "https://tirepredict-production.up.railway.app"
try { (Invoke-WebRequest "$base/health" -UseBasicParsing).Content } catch { $_.Exception.Response.StatusCode.value__ }
```

Se `/` devolver JSON (`{"status":"online","service":"TirePredict"}`), esse domínio é a **API**, não o frontend. O frontend, quando existe, é outro serviço e outro domínio.

> `VITE_API_URL` é assada no bundle durante o build. Trocar essa variável **não** muda nada no que já está publicado — exige rebuild.

---

## 2. Checagem de 10 minutos

Faça na ordem; pare no primeiro item que falhar.

| # | O que checar | Onde | Esperado | Se falhar |
| --- | --- | --- | --- | --- |
| 1 | Deploy mais recente | Deployments (topo da lista) | **Success**, com commit igual ao último da `main` | Seção 4.A |
| 2 | Build log | Deploy → Build Logs | Termina com imagem construída, sem `pip` error | Seção 4.A |
| 3 | Pre-deploy / release | Deploy → Deploy Logs, passo **Release** ou **Pre-deploy** | Uma linha `INFO [alembic.runtime.migration] Running upgrade` | Seção 5 (a armadilha) |
| 4 | Start | Deploy → Deploy Logs | `Application startup complete` e `Uvicorn running on http://0.0.0.0:<porta>` | Seção 4.C |
| 5 | Healthcheck | `GET /health` | `200`, `database.status=ok`, `ml.available=true` | Seção 4.C |
| 6 | **Rota de dados** | `GET /frota` | `200` com lista de máquinas | Seção 4.B |
| 7 | Schema aplicado | Aba Data do Postgres → query abaixo | `version_num = 20261009_02` | Seção 4.B |

O passo 6 é o que o healthcheck não cobre. Rode os quatro endpoints de uma vez:

```powershell
$base = "https://tirepredict-production.up.railway.app"
foreach ($r in "/health", "/maquinas", "/frota", "/alertas") {
  try   { $c = (Invoke-WebRequest "$base$r" -UseBasicParsing).StatusCode }
  catch { $c = $_.Exception.Response.StatusCode.value__ }
  "{0,-12} {1}" -f $r, $c
}
```

---

## 3. Sintoma → onde olhar

| Sintoma | Causa mais provável | Onde confirmar |
| --- | --- | --- |
| Deploy vermelho, nada publicado | `pip install`, import quebrado, `alembic.ini` fora do build | Build Logs |
| Deploy verde, mas app em loop de restart | erro no `preDeploy`, porta errada, env obrigatória ausente | Deploy Logs |
| `502 Application failed to respond` | processo não escutou em `$PORT` | Deploy Logs, `startCommand` |
| `/health` em `503` | banco inacessível ou `DATABASE_URL` errada | `/health` traz `database.detail` |
| `/health` `200` mas rotas de dados `500` | schema do Postgres atrás do código (**é o caso agora**) | Seção 4.B |
| Dados somem depois de cada deploy | `DATABASE_URL` apontando para SQLite (arquivo efêmero do container) | Seção 5 |
| Página abre, lista vazia, erro de CORS | `CORS_ORIGINS` sem o domínio do frontend | abas Network/Console do navegador |
| Frontend chama `localhost` | `VITE_API_URL` ausente no build | bundle publicado |

Antes de culpar o seu código: confira <https://status.railway.com>. A interface já chegou a exibir aviso de bloqueios de rede externa afetando a plataforma.

---

## 4. Roteiros por tipo de falha

### A. O deploy não passa

1. Deployments → clique no deploy vermelho → **Build Logs**.
2. Procure a primeira linha `error`; as seguintes costumam ser consequência.
3. Causas que já apareceram neste projeto:
   - dependência nova em `requirements.txt` sem versão fixa quebrando o `pip`;
   - arquivo importado que não entrou na imagem (`alembic.ini`, pasta `alembic/`);
   - `ENVIRONMENT=production` sem `WRITE_API_TOKEN` → o processo **aborta no startup** de propósito (validação em `backend/main.py`).
4. Se o build passou e o deploy morreu depois, o problema é release/start → Deploy Logs.

### B. Serviço no ar, rotas de dados em 500

Este é o estado atual da produção. Evidência, medida em 2026-11-05:

```
GET /health               200    database ok, ml available
GET /maquinas             200    [Trator John Deere]
GET /alertas              500    Internal Server Error
GET /frota                500    Internal Server Error
GET /leituras/1/recentes  500    Internal Server Error
```

`/maquinas` lê a tabela `maquinas`; os três que falham leem `leituras`. Ou seja: conexão ok, schema de `leituras` divergente. Repetindo a chamada a cada 8 s o resultado não muda — não é cold start nem instabilidade.

Roteiro:

1. **Deploy Logs** → filtre por `Traceback`, `psycopg2`, `UndefinedColumn`, `UndefinedTable`. A última linha do traceback nomeia a coluna ou tabela que falta.
2. **Aba Data** do serviço Postgres → cole a query da seção 4.D.
3. Compare com o esperado: revisão `20261009_02` e a coluna `horas_uso` presente em `leituras`.

Se a coluna `horas_uso` não existir, o `SELECT` gerado pelo ORM falha inteiro — inclusive em rotas que não usam essa coluna, como `/alertas`. É exatamente o cenário que a migration [`20261009_02_add_horas_uso.py`](../alembic/versions/20261009_02_add_horas_uso.py) foi escrita para corrigir.

Correção (você executa, é escrita em banco de produção):

```bash
# na raiz do projeto, com a DATABASE_URL de produção exportada na sessão
alembic upgrade head
alembic current        # deve imprimir 20261009_02 (head)
```

Alternativa sem exportar nada para o terminal: Railway → serviço `api` → menu de comandos → rodar `alembic upgrade head` no ambiente do serviço, ou `railway run alembic upgrade head` pela CLI (seção 6). Confirme depois pela aba Data que `version_num` avançou.

### C. Processo não sobe ou healthcheck falha

1. Deploy Logs: procure o primeiro erro de startup.
2. Porta: o `startCommand` precisa usar `$PORT`. Se estiver fixo em `8080` e o Railway injetar outra porta, o healthcheck nunca fecha.
3. `ENVIRONMENT=production` exige `DATABASE_URL` e `WRITE_API_TOKEN`. Ausência derruba o processo imediatamente, por desenho.
4. `/health` respondendo `503` traz `database.detail` — leia antes de mexer em qualquer coisa.
5. Aumentar `healthcheckTimeout` só mascara; banco lento se resolve em pool e índice.

### D. Queries para colar na aba Data (Postgres)

```sql
-- 1. Revisão aplicada: precisa ser a última do diretório alembic/versions
select version_num from alembic_version;

-- 2. Colunas reais da tabela que está quebrando
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'leituras'
order by ordinal_position;

-- 3. Existe dado? (tabela vazia explica tela vazia, não 500)
select count(*) as leituras, max(timestamp) as ultima from leituras;

-- 4. Tabelas que existem hoje
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Como interpretar:

| Resultado | Significado |
| --- | --- |
| `version_num = 20260917_01` e sem `horas_uso` | schema atrás do código → `alembic upgrade head` |
| `leituras` ausente na query 4 | migration nunca rodou contra este banco |
| `version_num = 20261009_02` e `horas_uso` presente | schema ok → o 500 vem do SQL/log, vá ao passo 1 da seção 4.B |
| contagem `0` | banco vazio, não é falha de schema |

---

## 5. A armadilha: preDeploy "verde" que não migra nada

`alembic/env.py` importa `DATABASE_URL` de `backend/database.py`, e esse módulo tem fallback:

```python
url = os.getenv("DATABASE_URL", f"sqlite:///{default_path}")
```

Consequência: se a variável não estiver visível no passo de release, o `alembic upgrade head` **cria um SQLite descartável dentro do container, migra esse arquivo, sai com código 0** e o deploy fica verde. O Postgres real não recebe nada. É o mecanismo mais provável para o drift atual.

Como distinguir os dois casos:

| Log do release | Diagnóstico |
| --- | --- |
| Nenhuma linha `alembic.runtime.migration` | o `preDeployCommand` não executou (ausente na UI, sobreposto pela configuração do dashboard ou fora do plano) |
| Linhas do alembic, mas `version_num` não mudou | ele migrou outro banco — fallback SQLite |

Blindagem recomendada (fazer o release falhar em vez de mentir):

```bash
python -c "import os,sys; u=os.getenv('DATABASE_URL',''); sys.exit(0 if u.startswith(('postgres://','postgresql://')) else 'DATABASE_URL ausente ou nao-Postgres: preDeploy migraria um SQLite descartavel')" \
  && alembic upgrade head
```

Detalhe do `railway.toml` vs. dashboard: quando a UI tem campos de build/deploy preenchidos, eles **sobrepõem** o arquivo. Se o preDeploy não aparece nos logs, comece por aí.

---

## 6. Pela CLI, sem clicar

```bash
npm i -g @railway/cli     # instala uma vez
railway login             # abre o navegador
railway link              # escolhe projeto e ambiente
railway status            # serviços e domínios do ambiente

railway logs              # logs do deploy corrente
railway logs -s api       # de um serviço específico
railway redeploy          # novo deploy sem mudar o código

railway variables         # imprime os VALORES — não cole a saída em chat
railway run alembic current   # executa local com as variáveis do ambiente remoto
```

`railway run` executa **no seu terminal** usando as variáveis remotas: ótimo para `alembic current`, mas é escrita real em produção quando o comando é `upgrade`. Trate como operação de produção.

Para inspecionar o banco com `psql`, a CLI do Railway oferece `railway connect` no serviço de Postgres.

---

## 7. O que mandar quando travar

Mande o suficiente para diagnosticar sem vazar segredo:

- id do deploy e status (Success / Failed / Crashed);
- as **cinco últimas linhas** do build log, em caso de erro de build;
- a linha final do traceback das Deploy Logs, com valores mascarados;
- resultado das queries 1 e 2 da seção 4.D;
- códigos HTTP de `/health`, `/maquinas`, `/frota`, `/alertas`.

**Nunca** cole `DATABASE_URL`, `WRITE_API_TOKEN`, `ADMIN_SEED_TOKEN`, `MQTT_PASSWORD` ou a saída crua de `railway variables`. Nomes de variáveis bastam.

---

## 8. Variáveis esperadas em produção

Só os nomes — confira presença, não valor.

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `DATABASE_URL` | sim | reference para `${{ Postgres.DATABASE_URL }}` |
| `WRITE_API_TOKEN` | sim | sem ela, `ENVIRONMENT=production` aborta o boot |
| `ENVIRONMENT` | sim | `production` |
| `ALERT_PRESSURE_THRESHOLD` | não | padrão 30 PSI |
| `TELEMETRIA_VALIDADE_SEGUNDOS` | não | padrão 120 s |
| `CORS_ORIGINS` | conforme o frontend | domínio publicado, separado por vírgula |
| `ADMIN_SEED_TOKEN` | só na primeira carga | depois pode ser removida |
| `MQTT_BROKER`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`, `MQTT_TOPIC` | não | vazias = subscriber desligado |
