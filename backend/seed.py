try:
    from .database import SessionLocal
    from .models import Maquina, Pneu
except ImportError:
    from database import SessionLocal
    from models import Maquina, Pneu

# Frota de demonstração: duas máquinas com configurações de pneus distintas.
# A Colheitadeira Case tem eixo adicional (pneu central traseiro), o que
# exercita o sistema com contagens diferentes por veículo.
_FROTA_DEMO = [
    {
        "nome": "Trator John Deere",
        "modelo": "6110J",
        "pneus": [
            "dianteiro_esquerdo",
            "dianteiro_direito",
            "traseiro_esquerdo",
            "traseiro_direito",
        ],
    },
    {
        "nome": "Colheitadeira Case",
        "modelo": "IH 6150",
        "pneus": [
            "dianteiro_esquerdo",
            "dianteiro_direito",
            "traseiro_esquerdo",
            "traseiro_direito",
            "traseiro_central",
        ],
    },
]


def _seed_maquina(db, nome: str, modelo: str, pneus: list[str]) -> int:
    maquina = db.query(Maquina).filter(Maquina.nome == nome, Maquina.modelo == modelo).first()
    if maquina is None:
        maquina = Maquina(nome=nome, modelo=modelo)
        db.add(maquina)
        db.flush()

    existentes = {pneu.posicao for pneu in maquina.pneus}
    for posicao in pneus:
        if posicao not in existentes:
            db.add(Pneu(maquina_id=maquina.id, posicao=posicao))
    return maquina.id


def seed():
    """Popula o banco com a frota de demonstração (idempotente).

    Execute `alembic upgrade head` antes de rodar seed.py.
    A função é idempotente: rodar mais de uma vez não duplica registros.
    Retorna o id da primeira máquina (compatibilidade com /admin/seed).
    """
    db = SessionLocal()
    try:
        ids = [
            _seed_maquina(db, m["nome"], m["modelo"], m["pneus"])
            for m in _FROTA_DEMO
        ]
        db.commit()
        return ids[0]
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    maquina_id = seed()
    print(f"Frota demo criada. Primeira maquina id={maquina_id}.")
