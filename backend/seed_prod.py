#!/usr/bin/env python
"""
Script de seed IDEMPOTENTE para PostgreSQL em produção.
Pode rodar múltiplas vezes sem duplicar dados.

Uso local:
  export DATABASE_URL="sqlite:///./test.db"
  python backend/seed_prod.py

Uso em Railway via CLI:
  railway run python backend/seed_prod.py

Uso em Railway via deploy (pre-deploy command):
  Configurar em railway.toml:
  [deploy]
  preDeployCommand = "python backend/seed_prod.py"
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Adiciona raiz ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import SessionLocal, Base, engine
    from models import Maquina, Pneu, Leitura
except ImportError as e:
    print(f"❌ Erro ao importar: {e}")
    print("Execute do diretório raiz ou dentro de backend/")
    sys.exit(1)


def seed_database():
    """Popula banco com dados iniciais. Totalmente idempotente."""
    
    # Cria tabelas se não existirem
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas verificadas/criadas")
    
    db = SessionLocal()
    
    try:
        # ===== MÁQUINA =====
        maquina_existing = db.query(Maquina).filter_by(nome="Trator John Deere").first()
        
        if maquina_existing:
            maquina = maquina_existing
            print(f"✅ Máquina já existe (ID={maquina.id})")
        else:
            maquina = Maquina(
                nome="Trator John Deere",
                modelo="6110J"
            )
            db.add(maquina)
            db.flush()  # Popula maquina.id sem commitar
            print(f"✅ Máquina criada (ID={maquina.id})")
        
        # ===== PNEUS =====
        posicoes = [
            "dianteiro_esquerdo",
            "dianteiro_direito",
            "traseiro_esquerdo",
            "traseiro_direito"
        ]
        
        pneus_map = {}
        for posicao in posicoes:
            pneu_existing = db.query(Pneu).filter_by(
                maquina_id=maquina.id,
                posicao=posicao
            ).first()
            
            if pneu_existing:
                pneus_map[posicao] = pneu_existing
                print(f"  ✅ Pneu {posicao} já existe (ID={pneu_existing.id})")
            else:
                pneu = Pneu(
                    maquina_id=maquina.id,
                    posicao=posicao
                )
                db.add(pneu)
                db.flush()
                pneus_map[posicao] = pneu
                print(f"  ✅ Pneu {posicao} criado (ID={pneu.id})")
        
        # ===== LEITURAS (Dados realistas) =====
        # Simula últimas 24 horas com 6 leituras por pneu
        base_time = datetime.utcnow()
        
        # Dados realistas de pneus agrícolas
        leituras_template = [
            {"pressao": 22.5, "temperatura": 34},
            {"pressao": 22.3, "temperatura": 35},
            {"pressao": 22.1, "temperatura": 36},
            {"pressao": 20.8, "temperatura": 38},  # Alerta leve
            {"pressao": 19.5, "temperatura": 40},  # Alerta médio
            {"pressao": 18.2, "temperatura": 42},  # Alerta crítico
        ]
        
        for posicao, pneu in pneus_map.items():
            # Verifica se já tem leituras
            existing_count = db.query(Leitura).filter_by(pneu_id=pneu.id).count()
            
            if existing_count > 0:
                print(f"  ✅ Pneu {posicao} já possui {existing_count} leituras")
                continue
            
            # Cria leituras espaçadas a cada 4 horas
            for i, template in enumerate(leituras_template):
                leitura = Leitura(
                    pneu_id=pneu.id,
                    pressao=template["pressao"],
                    temperatura=template["temperatura"],
                    timestamp=base_time - timedelta(hours=4 * (len(leituras_template) - 1 - i))
                )
                db.add(leitura)
            
            print(f"  ✅ {len(leituras_template)} leituras criadas para {posicao}")
        
        # Commit único (atomic)
        db.commit()
        print("\n✅✅✅ SEED CONCLUÍDO COM SUCESSO ✅✅✅")
        
        # ===== SUMÁRIO =====
        total_pneus = db.query(Pneu).filter_by(maquina_id=maquina.id).count()
        total_leituras = db.query(Leitura).join(Pneu).filter(
            Pneu.maquina_id == maquina.id
        ).count()
        
        print(f"\nSumário final:")
        print(f"  Máquinas: 1")
        print(f"  Pneus: {total_pneus}")
        print(f"  Leituras: {total_leituras}")
        print(f"\nTeste em produção:")
        print(f"  GET /maquinas → deve retornar 1 máquina")
        print(f"  GET /pneus/1 → deve retornar 4 pneus")
        print(f"  GET /leituras/1/recentes → deve retornar até 6 leituras")
        print(f"  GET /alertas → deve retornar 2 leituras críticas")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao fazer seed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = seed_database()
    sys.exit(0 if success else 1)

