# Contribuindo

1. Copie `.env.example` para `.env` e jamais versione segredos.
2. Use PostgreSQL em produção; SQLite é somente para desenvolvimento.
3. Aplique o schema com `alembic upgrade head` e rode `pytest` antes de abrir um PR.
4. Mantenha regras de risco no backend. O frontend apenas apresenta o contrato de `/frota`.
5. Adicione uma migration Alembic para cada alteração de modelo persistido.
