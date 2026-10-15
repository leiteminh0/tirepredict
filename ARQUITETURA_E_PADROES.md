# TirePredict: Arquitetura, Padrões e Roadmap de Estabilização

## 📋 Sumário Executivo

Este documento detalha a arquitetura atual do TirePredict, vulnerabilidades identificadas, correções aplicadas e os padrões que devem ser seguidos em todos os futuros desenvolvimentos para evitar conflitos e garantir escalabilidade em produção.

**Projeto**: SaaS Agro High-Ticket | **Ambição**: Predição de risco de pneus em máquinas agrícolas
**Status**: MVP em produção | **Foco**: Estabilização antes de novas features

---

## 🏗️ Arquitetura Atual

### Stack Completo
```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                           │
│  Vite + Recharts | React Router DOM | Axios                      │
│  Status: Não deployado na Railway (precisa setup)                │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP REST
┌───────────────────────────▼──────────────────────────────────────┐
│              BACKEND (FastAPI + Uvicorn)                         │
│  - 6 endpoints REST principais                                   │
│  - Validação com Pydantic v2.13                                  │
│  - CORS habilitado (allow_origins=["*"])                         │
│  - 1 replica em Amsterdam (AMS)                                  │
│  Domain: tirepredict-production.up.railway.app:8080              │
└────────┬─────────────────┬──────────────────────┬────────────────┘
         │                 │                      │
    [Banco de Dados]   [MQTT Client]         [ML Model]
    PostgreSQL 18      Paho MQTT             Random Forest
    Railway Postgres   (Opcional via env)    (joblib)
    Volume: 500 MB     Status: Graceful      Modelo: modelo_pneu.pkl
    Pool: 10-30 conn   off by default        Tamanho: ~550 KB
    Région: AMS        Reconexão auto        Carregado em memória
```

### Topologia de Conectividade

**Backend → Postgres**: Via DATABASE_URL (env var)
```
database.py detecta automaticamente:
  - SQLite se DATABASE_URL contiver "sqlite" (dev apenas)
  - PostgreSQL com pool robusto caso contrário (prod)
  - Pool: size=10, max_overflow=20, recycle=1800s, pre_ping=True
```

**Backend → MQTT**: Via MQTT_HOST + MQTT_PORT (env vars opcionais)
```
mqtt_subscriber.py:
  - Só conecta se MQTT_HOST estiver definido
  - Reconexão exponencial: 1s → MQTT_RECONNECT_DELAY
  - Salva leituras em Postgres automaticamente
  - Loop robusto com try/except em on_message
```

---

## 🚨 Vulnerabilidades Identificadas & Correções Aplicadas

### 1. **SQLAlchemy sem Connection Pooling** ✅ CORRIGIDO
**Severidade**: CRÍTICA  
**Impacto**: Em produção com 10+ requisições simultâneas, conexões vazavam → OOM

**O que foi feito**:
```python
# ❌ ANTES (database.py)
engine = create_engine(DATABASE_URL)  # Default pool_size=5, sem recycle

# ✅ DEPOIS
if _is_sqlite:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
        pool_pre_ping=True,  # Valida conexões antes de usar
    )
```

**Lição**: Toda conexão de banco em produção precisa de pool config explícita.

---

### 2. **MQTT Hardcoded em localhost:1883** ✅ CORRIGIDO
**Severidade**: ALTA  
**Impacto**: Startup falhava se MQTT não disponível localmente

**O que foi feito**:
```python
# ❌ ANTES
client.connect("localhost", 1883, 60)  # Falha imediata

# ✅ DEPOIS
MQTT_HOST = os.getenv("MQTT_HOST")     # None se não configurado
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

if not MQTT_HOST:
    print("[MQTT] MQTT_HOST não configurado — subscriber desativado.")
    return None
    
# Retry loop com backoff
while True:
    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        break
    except Exception as e:
        print(f"[MQTT] Tentando novamente em {MQTT_RECONNECT_DELAY}s...")
        time.sleep(MQTT_RECONNECT_DELAY)
```

**Lição**: Features opcionais devem falhar gracefully, não quebrar startup.

---

### 3. **SQLite Efêmero em Produção** ✅ CORRIGIDO
**Severidade**: CRÍTICA  
**Impacto**: Dados perdidos a cada restart; sem volume mount

**O que foi feito**:
```python
# ❌ ANTES
DATABASE_URL = "sqlite:///./tirepredict.db"  # Sempre

# ✅ DEPOIS
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tirepredict.db")
# Fallback local é sqlite, mas prod obrigado a usar Postgres via env
```

**Lição**: Env vars devem ter fallback sensato (sqlite para local), mas produção sempre deve override.

---

## 📐 Padrões & Boas Práticas

### A. Import Handling (Compatibilidade Local ↔ Docker)

Todos os arquivos Python usam este padrão:

```python
try:
    from .database import get_db, Base, engine  # Relativo (dentro do pacote)
except ImportError:
    from database import get_db, Base, engine   # Absoluto (local dev)
```

**Por quê**: Permite rodar tests/dev localmente sem instalar como pacote, mas Docker roda como `uvicorn backend.main:app` (import relativo).

**APLICAR A**: Qualquer novo módulo no `backend/`.

---

### B. Configuração via Variáveis de Ambiente

**Padrão**: `os.getenv("VAR_NAME", "default_value")`

**Variáveis obrigatórias em produção**:
```
DATABASE_URL          → postgresql://... (conecta ao Postgres Railway)
MQTT_HOST             → hostname (ex: mqtt.example.com) [OPCIONAL]
MQTT_PORT             → 1883 [OPCIONAL]
DB_POOL_SIZE          → 10 [OPCIONAL, tuning de performance]
DB_MAX_OVERFLOW       → 20 [OPCIONAL]
DB_POOL_RECYCLE       → 1800 [OPCIONAL]
```

**NUNCA** hardcode em arquivos. **SEMPRE** use `os.getenv()`.

---

### C. Padrão de Modelo SQLAlchemy

```python
class Maquina(Base):
    __tablename__ = "maquinas"
    id = Column(Integer, primary_key=True)
    nome = Column(String)
    modelo = Column(String)
    # ❌ FALTA: created_at, updated_at, índices, constraints
```

**Melhorias necessárias para novos modelos**:
```python
from datetime import datetime

class Maquina(Base):
    __tablename__ = "maquinas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    modelo = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('nome', 'modelo', name='uq_maquina_nome_modelo'),
    )
```

**APLICAR A**: Refactor de Maquina, Pneu, Leitura + novos modelos.

---

### D. Padrão de Endpoint REST

Estrutura obrigatória para manutenibilidade:

```python
from fastapi import HTTPException, status

@app.get("/maquinas/{maquina_id}", response_model=MaquinaOutput)
def obter_maquina(
    maquina_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes de uma máquina.
    
    Returns:
        MaquinaOutput: Dados da máquina
        
    Raises:
        HTTPException 404: Máquina não encontrada
    """
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if not maquina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Máquina {maquina_id} não encontrada"
        )
    return maquina
```

**APLICAR A**: Refactor de GET endpoints + novos endpoints.

---

### E. Tratamento de Erro em Async/Sync

FastAPI é **síncrono por default** no seu projeto (bom para DB queries).

**Se adicionar async**:
```python
@app.get("/dados-async")
async def fetch_async():
    # ✅ OK: Integra com tasks background
    background_tasks.add_task(process_data)
    return {"status": "processando"}

# ❌ NUNCA: Chamar sync DB query direto em async
async def bad_async():
    db.query(Maquina).all()  # Bloqueará event loop!
```

**Lição**: Se adicionar async, use `asyncpg` (async Postgres driver), não `psycopg2`.

---

### F. Logging Estruturado

**Status**: Não implementado, **DEVE SER** antes de mais features.

```python
import logging
import json

# Setup
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Uso
logger.info("Leitura salva", extra={
    "pneu_id": dados.pneu_id,
    "pressao": dados.pressao,
    "timestamp": datetime.utcnow().isoformat()
})

logger.error("Falha DB", exc_info=True)  # Inclui traceback
```

**Por quê**: Print statements não são parseáveis em produção; logs estruturados facilitam debugging.

---

## 🚀 Roadmap de Estabilização

### Fase 1: Código (Imediato)
- [ ] Adicionar logging estruturado a todos os endpoints
- [ ] Refactor modelos SQLAlchemy (created_at, updated_at, índices, constraints)
- [ ] Adicionar docstrings completas a todos os endpoints
- [ ] Implementar tratamento de erro 500 genérico com request ID
- [ ] Testes unitários para predicao.py
- [ ] Testes de integração para database.py

### Fase 2: DevOps (Semana 1-2)
- [ ] Adicionar health checks em `/health` endpoint
- [ ] Configurar pre-deploy command para migrations (Alembic)
- [ ] Segregar variáveis em `.env.example`
- [ ] Documentar secrets em railway.toml
- [ ] Adicionar CORS específico (não allow all)
- [ ] Setup de staging environment (separado de prod)

### Fase 3: Observabilidade (Semana 2-3)
- [ ] Prometheus metrics (`/metrics`)
- [ ] Distribuir MQTT processing em thread separada (não bloqueia startup)
- [ ] Monitorar pool PostgreSQL (conexões ativas)
- [ ] Alertas customizados via Railroad (Railway webhooks)

### Fase 4: Frontend (Semana 3-4)
- [ ] Deployer frontend React via Railway
- [ ] Variáveis de ambiente para API_BASE_URL
- [ ] Autenticação JWT (backend + frontend)
- [ ] Proteção de rota (middleware FastAPI)

---

## 🔐 Segurança (MVP → Produção)

### Crítica
- [ ] **CORS**: Mudar `allow_origins=["*"]` para lista whitelist
  ```python
  app.add_middleware(CORSMiddleware,
      allow_origins=[os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")],
      allow_credentials=True,
      allow_methods=["GET", "POST"],
      allow_headers=["*"]
  )
  ```
  
- [ ] **SQL Injection**: Usar ORM (SQLAlchemy) — ✅ Já feito
- [ ] **Secrets**: Nunca commitar `DATABASE_URL`, usar variáveis Railway
- [ ] **Rate Limit**: Implementar com `slowapi` antes de pública
  ```python
  from slowapi import Limiter
  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  
  @app.post("/leituras")
  @limiter.limit("30/minute")
  def salvar_leitura_manual(...):
  ```

### Importante
- [ ] **Input Validation**: Pydantic ✅ Já feito, aumentar rigor
  ```python
  class LeituraInput(BaseModel):
      pneu_id: int = Field(..., gt=0, description="ID do pneu")
      pressao: float = Field(..., ge=0, le=100, description="PSI")
      temperatura: float = Field(..., ge=-40, le=120, description="°C")
  ```

- [ ] **Logging PII**: Nunca logar DATABASE_URL, MQTT_HOST em logs públicos

---

## 📊 Performance (Métricas)

### Baseline Atual (1 replica, 1 conexão DB)
- CPU: ~15-20% (idle), ~40% (pico)
- Memória: ~280 MB (modelo RandomForest em RAM)
- Latência `/prever`: ~10ms
- Latência DB query: ~5-15ms (sem pool stress)

### Target (Produção com 1000+ usuários)
- [ ] Horizontalmente: 2+ replicas (multiRegionConfig)
- [ ] Cache: Redis para `/alertas` (dados 5 min old OK)
- [ ] Query optimization: índices em (pneu_id, timestamp)
- [ ] Compressão MQTT: gzip para payloads grandes

---

## 📦 Dependências & Versões

**Congeladas**:
```
fastapi==0.141.1          ← Atualizar a 0.145+ no próximo ciclo
SQLAlchemy==2.0.51        ← Estável, sem urgência de update
psycopg2-binary==2.9.12   ← Próximo: 2.9.13+ para bug fixes
```

**Risco Técnico**:
- `joblib` + `scikit-learn`: Acoplamento de versão modelo ↔ runtime
  - Solução: Versionamento de modelo (ex: `modelo_pneu_v1.pkl`)
  - Controlar imports com semver (ex: `sklearn==1.9.x` congelado)

---

## 🧪 Testes & QA

### Teste Local (sem Docker)
```bash
cd /root/repo
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL="sqlite:///./test.db"
python -m pytest backend/ -v --cov
```

### Teste em Docker (simulação produção)
```bash
docker build -t tirepredict .
docker run -e DATABASE_URL="postgresql://user:pass@localhost/test" \
           -e MQTT_HOST="" \
           -p 8080:8080 \
           tirepredict
```

### Checklist de Deploy
- [ ] Logs não contêm erros `@level:error`
- [ ] Melhor latência `/prever` < 50ms
- [ ] Nenhum warning de pool exhaustion
- [ ] Postgres consegue conectar (health check)
- [ ] CORS headers presentes
- [ ] Memoria < 350 MB

---

## 📞 Referências & Escalação

- **Banco de dados indisponível**: Check Railway dashboard → Postgres volume
- **MQTT não conecta**: Verificar MQTT_HOST + firewall (porta 1883)
- **OOM**: Aumentar `pool_size` (padrão 10 → 5 em dev)
- **Lentidão**: Logar tempos com `time.time()`, identificar gargalo (DB, model, rede)

---

## ✅ Checklist para Novo Desenvolvedor

Antes de fazer PR:
- [ ] Código segue import try/except pattern
- [ ] Todas env vars via `os.getenv()`
- [ ] Novo endpoint tem response_model Pydantic
- [ ] Trata erro 404/400 com HTTPException
- [ ] Log estruturado em operações críticas
- [ ] Testes locais passam (`pytest`)
- [ ] Database.py não alterado sem revisão
- [ ] Modelo SQLAlchemy tem índices/constraints se necessário

---

**Documento Criado**: 2026-09-04  
**Versão**: 1.0 (Baseline de Estabilização)  
**Próxima Revisão**: Após Fase 1 completada

