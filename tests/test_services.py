from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import Maquina, Pneu
from backend.services import salvar_leitura


def test_salvar_leitura_persiste_horas_de_uso():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    maquina = Maquina(nome="Trator", modelo="Teste")
    session.add(maquina)
    session.flush()
    pneu = Pneu(maquina_id=maquina.id, posicao="dianteiro_esquerdo")
    session.add(pneu)
    session.commit()

    leitura = salvar_leitura({"pneu_id": pneu.id, "pressao": 28, "temperatura": 35, "horas_uso": 123}, session)

    assert leitura.id is not None
    assert leitura.horas_uso == 123


def test_salvar_leitura_rejeita_pneu_inexistente():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    try:
        salvar_leitura({"pneu_id": 999, "pressao": 28, "temperatura": 35, "horas_uso": 0}, session)
    except ValueError as error:
        assert "999" in str(error)
    else:
        raise AssertionError("Uma leitura sem pneu não deve ser persistida")
