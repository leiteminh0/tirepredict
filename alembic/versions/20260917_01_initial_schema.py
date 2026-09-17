"""Schema inicial do TirePredict."""

from alembic import op
import sqlalchemy as sa

revision = "20260917_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Instalações antigas foram criadas com create_all, sem tabela alembic.
    # Preservamos os dados existentes e acrescentamos o campo novo antes de
    # registrar esta revisão como baseline.
    inspector = sa.inspect(op.get_bind())
    if "maquinas" in inspector.get_table_names():
        colunas = {column["name"] for column in inspector.get_columns("leituras")}
        if "horas_uso" not in colunas:
            with op.batch_alter_table("leituras") as batch:
                batch.add_column(sa.Column("horas_uso", sa.Float(), nullable=False, server_default="0"))
        indices = {index["name"] for index in inspector.get_indexes("leituras")}
        if "ix_leituras_pressao" not in indices:
            op.create_index("ix_leituras_pressao", "leituras", ["pressao"])
        return
    op.create_table("maquinas", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("nome", sa.String(length=120), nullable=False), sa.Column("modelo", sa.String(length=120), nullable=False))
    op.create_table("pneus", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("maquina_id", sa.Integer(), sa.ForeignKey("maquinas.id", ondelete="CASCADE"), nullable=False), sa.Column("posicao", sa.String(length=64), nullable=False), sa.UniqueConstraint("maquina_id", "posicao", name="uq_pneus_maquina_posicao"))
    op.create_index("ix_pneus_maquina_id", "pneus", ["maquina_id"])
    op.create_table("leituras", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("pneu_id", sa.Integer(), sa.ForeignKey("pneus.id", ondelete="CASCADE"), nullable=False), sa.Column("pressao", sa.Float(), nullable=False), sa.Column("temperatura", sa.Float(), nullable=False), sa.Column("horas_uso", sa.Float(), nullable=False, server_default="0"), sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False), sa.CheckConstraint("pressao >= 0", name="ck_leituras_pressao_positiva"), sa.CheckConstraint("pressao <= 250", name="ck_leituras_pressao_maxima"), sa.CheckConstraint("temperatura >= -80", name="ck_leituras_temperatura_valida"), sa.CheckConstraint("temperatura <= 200", name="ck_leituras_temperatura_maxima"), sa.CheckConstraint("horas_uso >= 0", name="ck_leituras_horas_uso_positiva"))
    op.create_index("ix_leituras_pneu_timestamp", "leituras", ["pneu_id", "timestamp"])
    op.create_index("ix_leituras_pressao", "leituras", ["pressao"])


def downgrade() -> None:
    op.drop_table("leituras")
    op.drop_table("pneus")
    op.drop_table("maquinas")
