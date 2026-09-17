import hmac
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

try:
    from .database import Base, engine, get_db, salvar_leitura
    from .models import Leitura, Maquina, Pneu
    from .mqtt_subscriber import subscriber
    from .predicao import prever_risco
    from .seed import seed
except ImportError:
    from database import Base, engine, get_db, salvar_leitura
    from models import Leitura, Maquina, Pneu
    from mqtt_subscriber import subscriber
    from predicao import prever_risco
    from seed import seed


class LeituraInput(BaseModel):
    pneu_id: int = Field(gt=0)
    pressao: float = Field(ge=0, le=250)
    temperatura: float = Field(ge=-80, le=200)


class PrevisaoInput(LeituraInput):
    horas_uso: float = Field(default=0, ge=0, le=200_000)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    subscriber.start()
    yield
    subscriber.stop()


app = FastAPI(title="TirePredict API", version="1.1.0", lifespan=lifespan)
origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Admin-Token"],
)


def leitura_dict(leitura: Leitura):
    return {"id": leitura.id, "pneu_id": leitura.pneu_id, "pressao": leitura.pressao, "temperatura": leitura.temperatura, "timestamp": leitura.timestamp}


@app.get("/")
def root():
    return {"status": "online", "service": "TirePredict", "mqtt": subscriber.status()}


@app.get("/health")
def health():
    return {"status": "ok", "mqtt": subscriber.status()}


@app.post("/admin/seed")
def popular_banco_producao(x_admin_token: str | None = Header(default=None)):
    """Cria a maquina e pneus iniciais; requer o token configurado no ambiente."""
    token_esperado = os.getenv("ADMIN_SEED_TOKEN")
    if not token_esperado:
        raise HTTPException(status_code=404, detail="Rota nao habilitada")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, token_esperado):
        raise HTTPException(status_code=401, detail="Token administrativo invalido")
    maquina_id = seed()
    return {"status": "pronto", "maquina_id": maquina_id}


@app.get("/maquinas")
def listar_maquinas(db: Session = Depends(get_db)):
    return [{"id": m.id, "nome": m.nome, "modelo": m.modelo} for m in db.query(Maquina).order_by(Maquina.nome).all()]


@app.get("/pneus/{maquina_id}")
def listar_pneus(maquina_id: int, db: Session = Depends(get_db)):
    if db.get(Maquina, maquina_id) is None:
        raise HTTPException(status_code=404, detail="Maquina nao encontrada")
    return [{"id": p.id, "maquina_id": p.maquina_id, "posicao": p.posicao} for p in db.query(Pneu).filter(Pneu.maquina_id == maquina_id).order_by(Pneu.id)]


@app.get("/leituras/{pneu_id}/recentes")
def leituras_recentes(pneu_id: int, db: Session = Depends(get_db)):
    if db.get(Pneu, pneu_id) is None:
        raise HTTPException(status_code=404, detail="Pneu nao encontrado")
    leituras = db.query(Leitura).filter(Leitura.pneu_id == pneu_id).order_by(Leitura.timestamp.desc()).limit(100).all()
    return [leitura_dict(leitura) for leitura in leituras]


@app.get("/alertas")
def alertas(db: Session = Depends(get_db)):
    leituras = db.query(Leitura).filter(Leitura.pressao < 30).order_by(Leitura.timestamp.desc()).limit(50).all()
    return [leitura_dict(leitura) for leitura in leituras]


@app.post("/leituras", status_code=status.HTTP_201_CREATED)
def salvar_leitura_manual(dados: LeituraInput, db: Session = Depends(get_db)):
    try:
        return leitura_dict(salvar_leitura(dados.model_dump(), db))
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/prever")
def prever(dados: PrevisaoInput):
    return prever_risco(dados.pressao, dados.temperatura, dados.horas_uso)
