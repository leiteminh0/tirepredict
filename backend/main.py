from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
try:
    from .database import get_db, Base, engine
    from .models import Maquina, Pneu, Leitura
    from .predicao import prever_risco
except ImportError:
    from database import get_db, Base, engine
    from models import Maquina, Pneu, Leitura
    from predicao import prever_risco

class LeituraInput(BaseModel):
    pneu_id: int
    pressao: float
    temperatura: float

class PrevisaoInput(BaseModel):
    pneu_id: int = Field(..., description="Identificador do pneu", examples=[1])
    pressao: float = Field(..., description="Pressao do pneu", examples=[22])
    temperatura: float = Field(..., description="Temperatura do pneu", examples=[36])
    horas_uso: float = Field(0.0, description="Horas de uso do pneu", examples=[0])

class PrevisaoOutput(BaseModel):
    nivel: str = Field(..., examples=["ALTO"])
    probabilidade: float = Field(..., examples=[0.83])
    acao_recomendada: str = Field(..., examples=["Verificar o pneu imediatamente."])

app = FastAPI(title="TirePredict API")

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"status": "TirePredict online"}

@app.get("/maquinas")
def listar_maquinas(db: Session = Depends(get_db)):
    return db.query(Maquina).all()

@app.get("/pneus/{maquina_id}")
def listar_pneus(maquina_id: int, db: Session = Depends(get_db)):
    return db.query(Pneu).filter(Pneu.maquina_id == maquina_id).all()

@app.get("/leituras/{pneu_id}/recentes")
def leituras_recentes(pneu_id: int, db: Session = Depends(get_db)):
    return db.query(Leitura).filter(
        Leitura.pneu_id == pneu_id
    ).order_by(Leitura.timestamp.desc()).limit(100).all()

@app.get("/alertas")
def alertas(db: Session = Depends(get_db)):
    criticas = db.query(Leitura).filter(Leitura.pressao < 30).order_by(
        Leitura.timestamp.desc()
    ).limit(50).all() 
    return criticas

@app.post("/leituras")
def salvar_leitura_manual(dados: LeituraInput, db: Session = Depends(get_db)):
    leitura = Leitura(pneu_id=dados.pneu_id, pressao=dados.pressao, temperatura=dados.temperatura)
    db.add(leitura)
    db.commit()
    db.refresh(leitura)
    return {"status": "salvo", "pressao": dados.pressao, "id": leitura.id}

@app.post("/prever", response_model=PrevisaoOutput)
def prever(
    dados: PrevisaoInput
):
    """Predicao de risco usando Random Forest."""
    resultado = prever_risco(
        dados.pressao,
        dados.temperatura,
        dados.horas_uso
    )
    return resultado
