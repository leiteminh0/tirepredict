# 🎯 PROMPT EXECUTIVO PARA DEV SENIOR - TirePredict Stabilization

## Context Urgente

Você está recebendo um projeto SaaS de startup agro (TirePredict) que está em produção mas precisa de **estabilização crítica** antes do próximo ciclo de features. O projeto foi analisado por Railway Agent e identificadas 3 vulnerabilidades CORRIGIDAS mas faltam **padrões, documentação e testes** para evitar regressões futuras.

**Objetivo**: Deixar a base de código **production-ready**, com padrões claros que próximos desenvolvedores seguirão sem questionar.

---

## 🔍 Análise de Situação Atual

### ✅ O que está bom
- Stack limpo: FastAPI + SQLAlchemy + React
- Database pooling agora correto (NÃO estava antes)
- MQTT gracefully desativado quando não configurado
- Todos os endpoints funcionando
- PostgreSQL em produção com volume persistente
- Modelo ML carregado e previsões operacionais

### ⚠️ O que precisa ser feito AGORA
1. **Logging estruturado** — Atualmente apenas `print()` e FastAPI defaults
2. **Validação rigorosa** — Pydantic exists mas poderia ser mais restritivo
3. **Error handling** — Sem tratamento 500 genérico, sem request IDs
4. **Testes** — Zero testes; predicao.py e database.py criticamente sem cobertura
5. **Documentação de API** — Docstrings incompletas
6. **Migração de DB** — Sem Alembic; alterações de schema são manuais e arriscadas
7. **Health checks** — Sem endpoint `/health` para orchestração
8. **CORS hardcoded** — `allow_origins=["*"]` é inseguro

### 🚫 Problemas que JÁ foram corrigidos (ref: PR #1)
- SQLAlchemy pool config
- MQTT localhost hardcoding
- SQLite em produção

---

## 📋 Tarefas Específicas (Ordem de Prioridade)

### TASK 1: Logging Estruturado Completo (4h)

**Objetivo**: Substituir `print()` por `logging` estruturado em todos os módulos.

**Arquivos a modificar**:
- `backend/main.py` — Adicionar logger a cada endpoint
- `backend/database.py` — Log de pool events, erros de conexão
- `backend/mqtt_subscriber.py` — Log de reconexão, mensagens processadas
- `backend/predicao.py` — Log de erros de modelo

**Padrão a usar**:
```python
import logging
import json
from datetime import datetime

# No início de cada arquivo
logger = logging.getLogger(__name__)

# Configuração global em main.py
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
)

# Uso em endpoints
@app.post("/leituras")
def salvar_leitura_manual(dados: LeituraInput, db: Session = Depends(get_db)):
    try:
        leitura = Leitura(...)
        db.add(leitura)
        db.commit()
        db.refresh(leitura)
        
        logger.info("Leitura salva com sucesso", extra={
            "pneu_id": dados.pneu_id,
            "pressao": dados.pressao,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"status": "salvo", "id": leitura.id}
    except Exception as e:
        logger.error("Falha ao salvar leitura", exc_info=True, extra={
            "pneu_id": dados.pneu_id
        })
        raise HTTPException(status_code=500, detail="Erro ao processar leitura")
```

**Testes pós-implementação**:
```bash
# Local: logs devem aparecer no stdout
python -m uvicorn backend.main:app --reload

# Produção: verificar Railway logs dashboard
# Logs estruturados facilitam busca por error patterns
```

---

### TASK 2: Validação com Pydantic + Input Sanitization (3h)

**Objetivo**: Aumentar rigor de validação; proteger contra inputs inválidos.

**Arquivos a modificar**:
- `backend/main.py` — Schemas Pydantic (adicionar restrições)

**Padrão**:
```python
from pydantic import BaseModel, Field, field_validator

class LeituraInput(BaseModel):
    pneu_id: int = Field(..., gt=0, description="ID do pneu (> 0)")
    pressao: float = Field(..., ge=0, le=100, description="Pressão PSI (0-100)")
    temperatura: float = Field(..., ge=-40, le=120, description="Temperatura °C (-40 a 120)")
    
    @field_validator('pneu_id')
    def validate_pneu_id(cls, v):
        if v < 1:
            raise ValueError('pneu_id deve ser positivo')
        return v
    
    @field_validator('pressao')
    def validate_pressao(cls, v):
        if v < 10:
            logger.warning(f"Pressão anormalmente baixa: {v} PSI")
        return v

class PrevisaoInput(BaseModel):
    pneu_id: int = Field(..., gt=0)
    pressao: float = Field(..., ge=0, le=100)
    temperatura: float = Field(..., ge=-40, le=120)
    horas_uso: float = Field(default=0, ge=0, le=100000, description="Horas acumuladas")
```

**Teste**:
```bash
# Deve rejeitar
curl -X POST http://localhost:8080/leituras \
  -H "Content-Type: application/json" \
  -d '{"pneu_id": -1, "pressao": 150, "temperatura": 200}'

# Deve aceitar
curl -X POST http://localhost:8080/leituras \
  -H "Content-Type: application/json" \
  -d '{"pneu_id": 1, "pressao": 22.5, "temperatura": 36}'
```

---

### TASK 3: Tratamento de Erro Global + Request ID (3h)

**Objetivo**: Todos os erros 500 retornam JSON com request_id para debugging.

**Arquivos a modificar**:
- `backend/main.py` — Exception handler global

**Padrão**:
```python
import uuid
from fastapi import Request
from fastapi.responses import JSONResponse

# Middleware para request ID
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Exception handler global
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        "Unhandled exception",
        exc_info=True,
        extra={"request_id": request_id, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "request_id": request_id,
            "detail": "Entre em contato com suporte com este ID"
        }
    )

# HTTPException específicas
from fastapi import HTTPException, status

@app.get("/maquinas/{maquina_id}")
def get_maquina(maquina_id: int, db: Session = Depends(get_db)):
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if not maquina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Máquina {maquina_id} não encontrada"
        )
    return maquina
```

---

### TASK 4: Health Check Endpoint (1h)

**Objetivo**: Endpoint `/health` que verifica DB, MQTT, modelo ML.

**Arquivo a modificar**:
- `backend/main.py` — Adicionar endpoint

**Padrão**:
```python
from sqlalchemy import text

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check da aplicação.
    
    Returns:
        status: "healthy" ou "unhealthy"
        checks: dict com status de cada componente
    """
    checks = {
        "database": "unknown",
        "model": "unknown"
    }
    
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        logger.error("Database health check failed", exc_info=True)
        checks["database"] = "down"
    
    try:
        # Verifica se modelo está carregado
        from .predicao import modelo
        if modelo is not None:
            checks["model"] = "ok"
        else:
            checks["model"] = "uninitialized"
    except Exception as e:
        logger.error("Model health check failed", exc_info=True)
        checks["model"] = "failed"
    
    overall_status = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    
    return {
        "status": overall_status,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }
```

**Teste**:
```bash
curl http://localhost:8080/health
# {"status": "healthy", "checks": {"database": "ok", "model": "ok"}, "timestamp": "..."}
```

---

### TASK 5: Testes Unitários (6h)

**Objetivo**: Cobertura mínima 60% em modules críticos.

**Arquivo a criar**:
- `backend/test_predicao.py`
- `backend/test_database.py`
- `backend/test_main.py`

**Padrão** (`backend/test_predicao.py`):
```python
import pytest
from backend.predicao import prever_risco

def test_prever_risco_pressao_alta():
    """Teste pressão dentro dos parâmetros."""
    resultado = prever_risco(pressao=22.5, temperatura=36, horas_uso=0)
    
    assert resultado["nivel"] in ["BAIXO", "MEDIO", "ALTO"]
    assert 0 <= resultado["probabilidade"] <= 1
    assert resultado["acao_recomendada"] is not None

def test_prever_risco_pressao_baixa():
    """Teste pressão crítica."""
    resultado = prever_risco(pressao=10, temperatura=40, horas_uso=1000)
    
    # Random Forest provavelmente retorna ALTO
    assert resultado["nivel"] == "ALTO" or resultado["probabilidade"] > 0.7

def test_prever_risco_valores_extremos():
    """Teste valores nos limites."""
    resultado = prever_risco(pressao=0, temperatura=-40, horas_uso=0)
    assert resultado["nivel"] in ["BAIXO", "MEDIO", "ALTO"]
```

**Padrão** (`backend/test_database.py`):
```python
import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from backend.database import Base, SessionLocal
from backend.models import Maquina, Pneu, Leitura

@pytest.fixture
def test_db():
    """DB em memória para testes."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    
    SessionLocal_ = sessionmaker(bind=engine)
    db = SessionLocal_()
    
    yield db
    db.close()

def test_criar_maquina(test_db):
    """Testa criação de máquina."""
    maquina = Maquina(nome="Trator", modelo="John Deere")
    test_db.add(maquina)
    test_db.commit()
    
    resultado = test_db.query(Maquina).filter_by(nome="Trator").first()
    assert resultado is not None
    assert resultado.modelo == "John Deere"

def test_criar_pneu_com_fk(test_db):
    """Testa Foreign Key."""
    maquina = Maquina(nome="Trator", modelo="JD")
    test_db.add(maquina)
    test_db.commit()
    
    pneu = Pneu(maquina_id=maquina.id, posicao="dianteiro_esquerdo")
    test_db.add(pneu)
    test_db.commit()
    
    assert pneu.maquina_id == maquina.id
```

**Padrão** (`backend/test_main.py`):
```python
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "TirePredict online"

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] in ["healthy", "degraded"]
    
def test_salvar_leitura_valida():
    response = client.post("/leituras", json={
        "pneu_id": 1,
        "pressao": 22.5,
        "temperatura": 36
    })
    # Pode falhar (DB), mas não deve dar erro de validação
    assert response.status_code in [200, 500]  # Accept both if DB issue

def test_salvar_leitura_invalida():
    response = client.post("/leituras", json={
        "pneu_id": -1,  # Inválido
        "pressao": 150,  # Fora do range
        "temperatura": 200  # Fora do range
    })
    assert response.status_code == 422  # Validation error
```

**Executar testes**:
```bash
pip install pytest pytest-cov
cd /root/repo
python -m pytest backend/ -v --cov=backend --cov-report=term-missing

# Esperado: ~60%+ cobertura
```

---

### TASK 6: Refactor Modelos SQLAlchemy (4h)

**Objetivo**: Adicionar timestamps, índices, constraints a modelos existentes.

**Arquivo a modificar**:
- `backend/models.py`

**Padrão**:
```python
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Index, UniqueConstraint, CheckConstraint
from datetime import datetime

class Maquina(Base):
    __tablename__ = "maquinas"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, index=True)
    modelo = Column(String(255), nullable=False)
    serial = Column(String(100), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('nome', 'modelo', name='uq_maquina_nome_modelo'),
        Index('idx_created_at', 'created_at'),
    )

class Pneu(Base):
    __tablename__ = "pneus"
    
    id = Column(Integer, primary_key=True, index=True)
    maquina_id = Column(Integer, ForeignKey("maquinas.id", ondelete="CASCADE"), nullable=False)
    posicao = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('maquina_id', 'posicao', name='uq_pneu_posicao'),
        Index('idx_maquina_id', 'maquina_id'),
    )

class Leitura(Base):
    __tablename__ = "leituras"
    
    id = Column(Integer, primary_key=True, index=True)
    pneu_id = Column(Integer, ForeignKey("pneus.id", ondelete="CASCADE"), nullable=False)
    pressao = Column(Float, nullable=False)
    temperatura = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_pneu_timestamp', 'pneu_id', 'timestamp'),
        CheckConstraint('pressao >= 0 AND pressao <= 100', name='ck_pressao_range'),
        CheckConstraint('temperatura >= -40 AND temperatura <= 120', name='ck_temp_range'),
    )
```

**Migração (manual, sem Alembic por agora)**:
```sql
-- Execute no Postgres via Railway
ALTER TABLE pneus ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE leituras ADD COLUMN timestamp_idx TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_created_at ON maquinas(created_at);
CREATE INDEX idx_maquina_id ON pneus(maquina_id);
CREATE INDEX idx_pneu_timestamp ON leituras(pneu_id, timestamp);
```

---

### TASK 7: Documentação de Endpoints (2h)

**Objetivo**: Docstrings completas em todos os endpoints.

**Arquivo a modificar**:
- `backend/main.py` — Docstrings + exemplos

**Padrão**:
```python
@app.get(
    "/maquinas/{maquina_id}",
    response_model=MaquinaOutput,
    summary="Obter detalhes de máquina",
    tags=["Máquinas"]
)
def obter_maquina(
    maquina_id: int = Field(..., description="ID da máquina", example=1),
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes completos de uma máquina específica.
    
    - **maquina_id**: ID único da máquina (obrigatório)
    
    Returns:
        MaquinaOutput: Nome, modelo, ID, datas de criação/atualização
        
    Raises:
        HTTPException 404: Máquina não encontrada
        HTTPException 500: Erro no servidor
        
    Example Response:
        {
            "id": 1,
            "nome": "Trator John Deere",
            "modelo": "6110J",
            "created_at": "2026-09-04T19:27:00",
            "updated_at": "2026-09-04T19:27:00"
        }
    """
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if not maquina:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
    return maquina
```

**Verificar**: Swagger em `http://localhost:8080/docs` mostra documentação completa.

---

### TASK 8: CORS Seguro (1h)

**Objetivo**: Substituir `allow_origins=["*"]` por whitelist.

**Arquivo a modificar**:
- `backend/main.py` — Configuração CORS

**Padrão**:
```python
import os

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"  # Vite default port
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=3600  # 1 hora cache preflight
)
```

**Em Railway (variável)**:
```
ALLOWED_ORIGINS=https://tirepredict-production.up.railway.app,https://app.tirepredict.com
```

---

## 🎯 Priorização de Tarefas

| Task | Horas | Impacto | Ordem |
|------|-------|--------|-------|
| Logging Estruturado | 4h | ALTO | 1 |
| Health Check | 1h | MÉDIO | 2 |
| CORS Seguro | 1h | MÉDIO | 3 |
| Validação Pydantic | 3h | ALTO | 4 |
| Error Handling Global | 3h | ALTO | 5 |
| Testes Unitários | 6h | CRÍTICO | 6 |
| Refactor Modelos | 4h | MÉDIO | 7 |
| Documentação | 2h | BAIXO | 8 |

**Total**: ~24h (3 dias dev time)

---

## 📋 Checklist de Execução

### Antes de começar
- [ ] Clone repo: `git clone leiteminh0/tirepredict`
- [ ] Setup local: `python -m venv venv && pip install -r requirements.txt`
- [ ] Teste: `DATABASE_URL=sqlite:///test.db uvicorn backend.main:app`
- [ ] Read: `ARQUITETURA_E_PADROES.md` (arquivo novo no repo)

### Durante desenvolvimento
- [ ] Branch: `git checkout -b stabilization/logging-error-handling`
- [ ] Comits atômicos por task (não misture logging + testes)
- [ ] Teste local após cada task: `pytest backend/ -v`
- [ ] Logs estruturados parecem bons?

### Após completar todas tasks
- [ ] Rebase clean: `git rebase main`
- [ ] PR description: copie checklist do final desta seção
- [ ] Railway: Deploy em staging branch
- [ ] Validar: Health check `/health`, Swagger `/docs`, sem erros

---

## 🔗 Referências Úteis

- **FastAPI Logging**: https://fastapi.tiangolo.com/advanced/additional-responses/
- **SQLAlchemy Índices**: https://docs.sqlalchemy.org/en/20/core/indexes.html
- **Pydantic Validação**: https://docs.pydantic.dev/latest/concepts/validators/
- **Pytest FastAPI**: https://fastapi.tiangolo.com/advanced/testing-dependencies/

---

## ❓ Dúvidas Frequentes

**P: Devo usar async/await?**  
A: NÃO por agora. Seu projeto é sincro. Se adicionar async, use `asyncpg` + `asyncio` completamente, não misture.

**P: E Alembic para migrations?**  
A: Task 6 usa SQL manual. Adicionar Alembic é próximo ciclo.

**P: Preciso adicionar autenticação?**  
A: NÃO neste ciclo. Estabilização primeiro, depois segurança (JWT).

**P: Rate limiting?**  
A: Opcional agora, adicionar `slowapi` no ciclo 2.

**P: Que versão Python usar?**  
A: Python 3.9+ (seu requirements.txt é agnóstico).

---

**Status**: Pronto para execução  
**Estimativa**: 3-4 dias (1 dev senior)  
**Resultado esperado**: Codebase production-ready, padrões estabelecidos, zero regressões futuras

Boa sorte! 🚀

