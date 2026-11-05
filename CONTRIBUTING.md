# Contribuindo

1. Copie `.env.example` para `.env` e jamais versione segredos.
2. Use PostgreSQL em produção; SQLite é somente para desenvolvimento.
3. Aplique o schema com `alembic upgrade head` e rode `pytest` antes de abrir um PR.
4. Mantenha regras de risco no backend. O frontend apenas apresenta o contrato de `/frota`.
5. Adicione uma migration Alembic para cada alteração de modelo persistido.
6. O CI (`.github/workflows/ci.yml`) roda, a cada push e PR na `main`: `python -m pytest`, `npm run lint` e `npm run build`. Rode os três localmente antes de abrir o PR — o build do frontend exige `VITE_API_URL` definida.
