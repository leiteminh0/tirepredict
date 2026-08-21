try:
    from .database import SessionLocal, Base, engine
    from .models import Maquina, Pneu
except ImportError:
    from database import SessionLocal, Base, engine
    from models import Maquina, Pneu

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Cria uma máquina de teste
maquina = Maquina(nome="Trator John Deere", modelo="6110J")
db.add(maquina)
db.commit()
db.refresh(maquina)

# Cria 4 pneus para essa máquina
posicoes = ["dianteiro_esquerdo", "dianteiro_direito", "traseiro_esquerdo", "traseiro_direito"]
for p in posicoes:
    pneu = Pneu(maquina_id=maquina.id, posicao=p)
    db.add(pneu)

db.commit()
db.close()
print("Dados iniciais criados com sucesso!")