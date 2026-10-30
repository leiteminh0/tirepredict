"""Garante coluna horas_uso em leituras (produção PostgreSQL).

A migration 20260917_01 já adiciona horas_uso para bancos sem alembic_version,
mas bancos que já tinham alembic_version registrada pularam esse ADD COLUMN.
Esta migration aplica o mesmo add_column de forma idempotente para esses casos.
"""

from alembic import op
import sqlalchemy as sa

revision = "20261009_02"
down_revision = "20260917_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Só age se a tabela leituras existir (segurança extra)
    if "leituras" not in inspector.get_table_names():
        return

    colunas = {col["name"] for col in inspector.get_columns("leituras")}
    if "horas_uso" in colunas:
        # Coluna já existe — nada a fazer
        return

    # PostgreSQL não suporta ADD COLUMN com nullable=False sem server_default
    # server_default="0" preenche linhas existentes imediatamente
    with op.batch_alter_table("leituras") as batch:
        batch.add_column(
            sa.Column(
                "horas_uso",
                sa.Float(),
                nullable=False,
                server_default="0",
            )
        )


def downgrade() -> None:
    # Não remove a coluna no downgrade — dados existentes seriam perdidos
    pass
