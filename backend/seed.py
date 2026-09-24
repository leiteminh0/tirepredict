try:
    from .database import SessionLocal
    from .models import Maquina, Pneu
except ImportError:
    from database import SessionLocal
    from models import Maquina, Pneu


def seed():
    # create_all removido — o schema é gerenciado exclusivamente pelo Alembic.
    # Execute `alembic upgrade head` antes de rodar seed.py.
    db = SessionLocal()
    try:
        maquina = db.query(Maquina).filter(Maquina.nome == "Trator John Deere", Maquina.modelo == "6110J").first()
        if maquina is None:
            maquina = Maquina(nome="Trator John Deere", modelo="6110J")
            db.add(maquina)
            db.flush()

        existentes = {pneu.posicao for pneu in maquina.pneus}
        for posicao in ("dianteiro_esquerdo", "dianteiro_direito", "traseiro_esquerdo", "traseiro_direito"):
            if posicao not in existentes:
                db.add(Pneu(maquina_id=maquina.id, posicao=posicao))
        db.commit()
        return maquina.id
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    maquina_id = seed()
    print(f"Dados iniciais prontos para a maquina {maquina_id}.")
