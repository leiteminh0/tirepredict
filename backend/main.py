"""API HTTP do TirePredict."""
import hmac
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session, selectinload

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
logger = logging.getLogger(__name__)

try:
    from .database import Base, engine, get_db
    from .models import Leitura, Maquina, Pneu
    from .mqtt_subscriber import subscriber
    from .predicao import ModeloIndisponivelError, carregar_modelo, prever_risco
    from .seed import seed
    from .services import limite_alerta, salvar_leitura
except ImportError:
    from database import Base, engine, get_db
    from models import Leitura, Maquina, Pneu
    from mqtt_subscriber import subscriber
    from predicao import ModeloIndisponivelError, carregar_modelo, prever_risco
    from seed import seed
    from services import limite_alerta, salvar_leitura


class LeituraInput(BaseModel):
    pneu_id: int = Field(gt=0)
    pressao: float = Field(ge=0, le=250)
    temperatura: float = Field(ge=-80, le=200)
    horas_uso: float = Field(default=0, ge=0, le=200_000)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        app.state.modelo = carregar_modelo()
        app.state.modelo_erro = None
        logger.info("Modelo de previsão carregado")
    except Exception as error:
        app.state.modelo = None
        app.state.modelo_erro = str(error)
        logger.exception("Modelo ML indisponível; /prever responderá 503")
    subscriber.start()
    yield
    subscriber.stop()


app = FastAPI(title="TirePredict API", version="2.0.0", lifespan=lifespan)
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-Admin-Token", "X-API-Token"])


def leitura_dict(leitura: Leitura):
    return {"id": leitura.id, "pneu_id": leitura.pneu_id, "pressao": leitura.pressao, "temperatura": leitura.temperatura, "horas_uso": leitura.horas_uso, "timestamp": leitura.timestamp}


def previsao_para_leitura(leitura: Leitura, request: Request) -> dict:
    modelo = getattr(request.app.state, "modelo", None)
    if modelo is None:
        return {"nivel": "INDISPONIVEL", "probabilidade": None, "acao_recomendada": "Modelo temporariamente indisponível."}
    return prever_risco(leitura.pressao, leitura.temperatura, leitura.horas_uso, modelo)


def exigir_token_escrita(x_api_token: str | None = Header(default=None)):
    """Protege escritas HTTP; o MQTT persiste internamente, sem passar pela API."""
    esperado = os.getenv("WRITE_API_TOKEN")
    if not esperado:
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            raise HTTPException(status_code=503, detail="WRITE_API_TOKEN não configurado")
        return
    if not x_api_token or not hmac.compare_digest(x_api_token, esperado):
        raise HTTPException(status_code=401, detail="Token de escrita inválido")


@app.get("/")
def root():
    return {"status": "online", "service": "TirePredict", "mqtt": subscriber.status()}


@app.get("/health")
def health(request: Request, db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        banco = {"status": "ok"}
    except Exception as error:
        logger.exception("Health check do banco falhou")
        banco = {"status": "error", "detail": str(error)}
    return {"status": "ok" if banco["status"] == "ok" else "degraded", "database": banco, "mqtt": subscriber.status(), "ml": {"available": getattr(request.app.state, "modelo", None) is not None}}


@app.post("/admin/seed")
def popular_banco_producao(x_admin_token: str | None = Header(default=None)):
    token = os.getenv("ADMIN_SEED_TOKEN")
    if not token:
        raise HTTPException(status_code=404, detail="Rota não habilitada")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, token):
        raise HTTPException(status_code=401, detail="Token administrativo inválido")
    return {"status": "pronto", "maquina_id": seed()}


@app.get("/maquinas")
def listar_maquinas(db: Session = Depends(get_db)):
    return [{"id": m.id, "nome": m.nome, "modelo": m.modelo} for m in db.query(Maquina).order_by(Maquina.nome)]


@app.get("/frota")
def listar_frota(request: Request, db: Session = Depends(get_db)):
    """Contrato agregado: o dashboard faz uma única chamada por atualização."""
    maquinas = db.query(Maquina).options(selectinload(Maquina.pneus).selectinload(Pneu.leituras)).order_by(Maquina.nome).all()
    resultado = []
    for maquina in maquinas:
        pneus = []
        for pneu in maquina.pneus:
            leituras = sorted(pneu.leituras, key=lambda item: item.timestamp, reverse=True)[:100]
            ultima = leituras[0] if leituras else None
            risco = previsao_para_leitura(ultima, request) if ultima else {"nivel": "BAIXO", "probabilidade": None, "acao_recomendada": "Aguardando primeira leitura."}
            pneus.append({"id": pneu.id, "maquina_id": pneu.maquina_id, "posicao": pneu.posicao, "ultima_leitura": leitura_dict(ultima) if ultima else None, "historico": [leitura_dict(item) for item in reversed(leituras)], "risco": risco})
        resultado.append({"id": maquina.id, "nome": maquina.nome, "modelo": maquina.modelo, "pneus": pneus})
    return resultado


@app.get("/pneus/{maquina_id}")
def listar_pneus(maquina_id: int, db: Session = Depends(get_db)):
    if db.get(Maquina, maquina_id) is None:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
    return [{"id": p.id, "maquina_id": p.maquina_id, "posicao": p.posicao} for p in db.query(Pneu).filter(Pneu.maquina_id == maquina_id).order_by(Pneu.id)]


@app.get("/leituras/{pneu_id}/recentes")
def leituras_recentes(pneu_id: int, db: Session = Depends(get_db)):
    if db.get(Pneu, pneu_id) is None:
        raise HTTPException(status_code=404, detail="Pneu não encontrado")
    leituras = db.query(Leitura).filter(Leitura.pneu_id == pneu_id).order_by(Leitura.timestamp.desc()).limit(100).all()
    return [leitura_dict(leitura) for leitura in leituras]


@app.get("/alertas")
def alertas(db: Session = Depends(get_db)):
    leituras = db.query(Leitura).filter(Leitura.pressao < limite_alerta()).order_by(Leitura.timestamp.desc()).limit(50).all()
    return [leitura_dict(leitura) for leitura in leituras]


@app.post("/leituras", status_code=status.HTTP_201_CREATED, dependencies=[Depends(exigir_token_escrita)])
def salvar_leitura_manual(dados: LeituraInput, db: Session = Depends(get_db)):
    try:
        return leitura_dict(salvar_leitura(dados.model_dump(), db))
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/prever")
def prever(dados: LeituraInput, request: Request, db: Session = Depends(get_db)):
    if db.get(Pneu, dados.pneu_id) is None:
        raise HTTPException(status_code=404, detail="Pneu não encontrado")
    try:
        return prever_risco(dados.pressao, dados.temperatura, dados.horas_uso, request.app.state.modelo)
    except ModeloIndisponivelError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
