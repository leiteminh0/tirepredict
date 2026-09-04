# TirePredict

## 1. O que é o projeto

O TirePredict é um sistema para monitoramento e previsão de risco em pneus de máquinas agrícolas. A ideia é receber dados de pressão, temperatura e horas de uso, armazenar as leituras e apresentar ao usuário o estado dos pneus em um dashboard.

O projeto é dividido em duas partes principais:

- **Backend Python:** API REST, banco de dados, recebimento de leituras via MQTT e previsão de risco usando Machine Learning.
- **Dashboard React:** interface web que consulta a API e exibe máquinas, pneus, últimas leituras, gráfico de pressão/temperatura e alertas.

O backend está hospedado na Railway. O dashboard é executado localmente com Vite durante o desenvolvimento e consulta a API publicada na Railway.

## 2. Estrutura atual

```text
TirePredict/
├── backend/
│   ├── database.py
│   ├── main.py
│   ├── modelo_pneu.pkl
│   ├── models.py
│   ├── mqtt_subscriber.py
│   ├── predicao.py
│   └── seed.py
├── tirepredict-dashboard/
│   ├── package.json
│   ├── src/
│   │   ├── api/api.js
│   │   ├── components/
│   │   │   ├── AlertaItem.jsx
│   │   │   ├── GraficoPressao.jsx
│   │   │   ├── MaquinaCard.jsx
│   │   │   └── PneuCard.jsx
│   │   ├── pages/Dashboard.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── ...arquivos do Vite
├── requirements.txt
├── tirepredict.db
├── .gitignore
└── README.md
```

## 3. Backend

### 3.1 API FastAPI

O arquivo `backend/main.py` cria a aplicação FastAPI chamada `TirePredict API`.

A API possui CORS aberto para permitir que o dashboard local, executado em outra porta, consiga fazer requisições.

Na inicialização, o backend executa `Base.metadata.create_all(bind=engine)`, garantindo que as tabelas existam no banco configurado.

### 3.2 Rotas disponíveis

| Método | Rota | Função |
|---|---|---|
| `GET` | `/` | Verifica se a API está online. |
| `GET` | `/maquinas` | Lista as máquinas cadastradas. |
| `GET` | `/pneus/{maquina_id}` | Lista os pneus de uma máquina. |
| `GET` | `/leituras/{pneu_id}/recentes` | Lista até 100 leituras recentes de um pneu. |
| `GET` | `/alertas` | Lista até 50 leituras com pressão abaixo de 30. |
| `POST` | `/leituras` | Salva uma leitura manual. |
| `POST` | `/prever` | Calcula o risco do pneu usando o modelo de Machine Learning. |

Exemplo de leitura manual:

```json
{
  "pneu_id": 1,
  "pressao": 22,
  "temperatura": 36
}
```

Exemplo de previsão:

```json
{
  "pneu_id": 1,
  "pressao": 22,
  "temperatura": 36,
  "horas_uso": 0
}
```

A previsão retorna um nível, uma probabilidade e uma ação recomendada:

```json
{
  "nivel": "ALTO",
  "probabilidade": 0.83,
  "acao_recomendada": "Verificar o pneu imediatamente."
}
```

### 3.3 Banco de dados

O acesso ao banco fica em `backend/database.py` e usa SQLAlchemy.

Por padrão, a aplicação usa:

```text
sqlite:///./tirepredict.db
```

Também existe suporte para configurar outro banco por meio da variável de ambiente `DATABASE_URL`, o que permite usar PostgreSQL em produção.

As tabelas são definidas em `backend/models.py`:

- `maquinas`: identifica a máquina e seu modelo.
- `pneus`: relaciona um pneu à máquina e registra sua posição.
- `leituras`: armazena pneu, pressão, temperatura e horário da medição.

O banco local analisado hoje continha:

- 1 máquina.
- 4 pneus.
- 0 leituras.

### 3.4 Seed

O arquivo `backend/seed.py` cria dados iniciais para teste:

- Máquina: `Trator John Deere`.
- Modelo: `6110J`.
- Quatro posições: dianteiro esquerdo, dianteiro direito, traseiro esquerdo e traseiro direito.

O script mostra:

```text
Dados iniciais criados com sucesso!
```

O seed foi executado/validado localmente, mas isso não significa que tenha sido executado no banco de produção da Railway. O SQLite local e o SQLite criado no container da Railway são bancos separados.

### 3.5 Machine Learning

O arquivo `backend/predicao.py` carrega `backend/modelo_pneu.pkl` com Joblib.

O modelo recebe três características:

1. Pressão.
2. Temperatura.
3. Horas de uso.

Os níveis de risco são:

- `BAIXO`: pneu dentro dos parâmetros normais.
- `MEDIO`: monitorar o pneu nas próximas horas.
- `ALTO`: verificar o pneu imediatamente.

Foi feito um teste real com pressão 22, temperatura 36 e 0 horas de uso. O modelo respondeu `ALTO`, com probabilidade `0.83`.

### 3.6 MQTT

O arquivo `backend/mqtt_subscriber.py` usa Paho MQTT e se conecta a:

```text
localhost:1883
```

Ele assina o tópico:

```text
tirepredict/leituras
```

A mensagem esperada é JSON:

```json
{
  "pneu_id": 1,
  "pressao": 22,
  "temperatura": 36
}
```

Ao receber a mensagem, o subscriber chama `salvar_leitura()` e grava os dados no banco.

## 4. Dashboard React

O dashboard foi criado com Vite, React 19 e Axios. As dependências também incluem Recharts para o gráfico.

O comando de desenvolvimento é:

```bash
cd tirepredict-dashboard
npm run dev
```

A aplicação fica disponível em:

```text
http://localhost:5173
```

### 4.1 Entrada da aplicação

`src/main.jsx` cria a raiz React e renderiza `App` dentro de `StrictMode`.

`src/App.jsx` foi substituído pelo componente principal solicitado:

```jsx
import Dashboard from './pages/Dashboard';

function App() {
  return <Dashboard />;
}

export default App;
```

### 4.2 Dashboard

`src/pages/Dashboard.jsx` faz as chamadas para:

- Listar máquinas.
- Listar alertas.
- Listar pneus quando uma máquina é selecionada.
- Listar leituras quando um pneu é selecionado.

A tela possui três áreas:

- **Máquinas:** cartões com nome e modelo.
- **Pneus:** posição, última pressão, temperatura e indicador de risco.
- **Alertas:** leituras críticas, ou a mensagem `Nenhum alerta no momento.` quando não há alertas.

O gráfico só aparece quando existem leituras para o pneu selecionado. Ele mostra pressão e temperatura ao longo do tempo usando Recharts.

### 4.3 API usada pelo dashboard

O arquivo `src/api/api.js` usa Axios com esta base:

```text
https://tirepredict-production.up.railway.app
```

Portanto, abrir o dashboard local não consulta automaticamente o SQLite local. Ele consulta o backend publicado na Railway.

## 5. O que foi feito hoje

### 5.1 Ativação do ambiente Python

O ambiente virtual `.venv` foi ativado dentro da pasta `backend`:

```powershell
Set-Location backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
& ..\.venv\Scripts\Activate.ps1
```

O prompt passou a aparecer com `(.venv)`.

### 5.2 Levantamento do projeto

Foi feita uma inspeção do repositório, incluindo:

- Arquivos existentes.
- Commits do Git.
- Backend.
- Modelo serializado.
- Banco SQLite.
- Dependências.
- Estrutura do dashboard.

O histórico encontrado foi:

- `be3bd0f`: importação inicial.
- `766f696`: backend completo com API, banco, predição e MQTT.
- `d1e6fc2`: inclusão do `modelo_pneu.pkl`.
- `5ef1ee7`: componentes e estilos iniciais do dashboard.

### 5.3 Proteção do `.gitignore`

Foram adicionadas ao `.gitignore` da raiz as regras:

```gitignore
tirepredict-dashboard/node_modules/
tirepredict-dashboard/dist/
```

Isso impede que as dependências instaladas e o build de produção sejam enviados ao GitHub por engano em um futuro `git add .`.

### 5.4 Substituição do App.jsx

O template inicial do Vite ainda mostrava a tela padrão com logos, contador e links de documentação. Esse conteúdo foi removido e `App.jsx` passou a renderizar diretamente o `Dashboard`.

### 5.5 Validação do frontend

Foi executado:

```bash
npm run build
```

O build passou com sucesso. O Vite exibiu apenas um aviso de bundle JavaScript maior que 500 kB; isso é um aviso de otimização, não uma falha de compilação.

Depois foi executado:

```bash
npm run dev
```

O servidor ficou disponível em `http://localhost:5173`.

A página abriu corretamente e exibiu:

- `Máquinas`.
- `Pneus`.
- `Alertas`.
- `Nenhum alerta no momento.`

### 5.6 Verificação do Console do navegador

A página foi recarregada com a captura do Console ativa.

Mensagens observadas:

```text
[vite] connecting...
[vite] connected.
Download the React DevTools for a better development experience...
```

Não apareceram linhas vermelhas, erros de JavaScript, erros de CORS ou erros de página.

Isso confirmou que o problema não era um crash do React.

### 5.7 Verificação da API online

O dashboard fez chamadas para:

```text
GET https://tirepredict-production.up.railway.app/maquinas
GET https://tirepredict-production.up.railway.app/alertas
```

As duas responderam `200 OK`, porém com:

```json
[]
```

Isso significa que a API está online e funcionando, mas o banco de produção está vazio.

## 6. Problema atual na Railway

O problema atual não é o React, não é o Axios e não é CORS.

A situação é esta:

1. O backend local possui um SQLite próprio.
2. O backend da Railway executa em outro container.
3. O SQLite do container da Railway é outro arquivo, independente do banco local.
4. O `seed.py` foi executado/validado localmente, mas não foi executado no ambiente de produção.
5. Por isso a API online responde corretamente, mas `/maquinas` retorna `[]`.
6. Sem máquinas, o dashboard não consegue exibir pneus ou leituras.
7. Sem leituras, o gráfico e a última leitura permanecem vazios.

A URL atualmente retorna:

```text
https://tirepredict-production.up.railway.app/maquinas -> []
```

O comportamento é esperado enquanto o banco de produção não receber o seed.

## 7. Tentativas de executar o seed em produção

### 7.1 Console web

Foi identificado que o Console web da Railway não estava aceitando teclado. A tela ficou esperando conexão e não permitia digitar comandos.

O problema relatado foi que o usuário aguardou bastante tempo, mas o Console nunca conectou nem exibiu um cursor utilizável.

Portanto, não foi possível executar `python backend/seed.py` pelo Console web.

### 7.2 Instalação da Railway CLI

A CLI não estava instalada. O comando `railway` inicialmente produzia:

```text
CommandNotFoundException
```

A Railway CLI foi instalada globalmente com:

```bash
npm install -g @railway/cli
```

A instalação foi confirmada com:

```text
railway 5.49.1
```

### 7.3 Login na Railway

Foi executado:

```bash
railway login
```

O login terminou com sucesso na conta autenticada da Railway.

### 7.4 Criação da chave SSH

A primeira tentativa de SSH informou que não havia chaves disponíveis:

```text
No SSH keys found in your SSH agent or ~/.ssh/
```

Foi criada uma chave Ed25519 local:

```text
C:\Users\alunodev25\.ssh\id_ed25519
```

A chave foi registrada com sucesso na Railway.

### 7.5 Erro definitivo do SSH

Foi tentado o acesso ao serviço com:

```bash
railway ssh --project=d7309550-1118-4503-add3-904ffbbb0993 --environment=af1fd3a5-9cd9-4ef2-89fe-0d786be98fd2 --service=a30381a7-d583-410f-83cc-755a81be281e
```

A Railway aceitou a chave, mas a conexão falhou com:

```text
ssh: connect to host ssh.railway.com port 22: Connection timed out
```

Esse erro acontece antes de o comando chegar no container. Ele indica bloqueio, filtragem ou indisponibilidade da porta TCP 22 na rede atual. Não indica erro no Python, no `seed.py` ou na aplicação.

## 8. Como resolver agora

A tentativa mais simples é usar outra rede, por exemplo o hotspot do celular, e repetir o SSH:

```bash
railway ssh --project=d7309550-1118-4503-add3-904ffbbb0993 --environment=af1fd3a5-9cd9-4ef2-89fe-0d786be98fd2 --service=a30381a7-d583-410f-83cc-755a81be281e
```

Se conectar, execute dentro do container:

```bash
python backend/seed.py
```

Se o caminho não existir:

```bash
cd backend
python seed.py
```

Depois teste:

```text
https://tirepredict-production.up.railway.app/maquinas
```

O resultado esperado é uma lista contendo a máquina `Trator John Deere`.

## 9. Solução mais confiável para não depender de acesso manual

Executar o seed manualmente resolve o teste atual, mas não é a melhor solução definitiva. O SQLite no Railway, sem volume persistente configurado, pode ser perdido quando ocorrer novo deploy ou reinicialização do serviço.

Antes da apresentação final, o projeto deve adotar uma destas soluções:

### Opção A: Volume persistente na Railway

Configurar um volume persistente e apontar o `DATABASE_URL` para um caminho dentro desse volume. Assim, o arquivo SQLite sobrevive aos deploys/reinicializações conforme a configuração da plataforma.

### Opção B: PostgreSQL

Usar PostgreSQL como banco de produção. O backend já possui dependência `psycopg2-binary` e aceita `DATABASE_URL`, então essa alternativa se encaixa na estrutura atual.

O PostgreSQL é a opção mais apropriada para uma aplicação de produção e para a apresentação final, pois evita depender de um arquivo SQLite efêmero dentro do container.

## 10. Próximas tarefas recomendadas

1. Conectar ao Railway por outra rede ou recuperar o Console web.
2. Executar o seed no ambiente de produção.
3. Confirmar que `/maquinas` retorna a máquina e que `/pneus/1` retorna quatro pneus.
4. Inserir pelo menos uma leitura via `POST /leituras` ou MQTT.
5. Confirmar que o dashboard mostra a última pressão e temperatura.
6. Confirmar o gráfico com leituras reais.
7. Testar o endpoint `/prever` em produção.
8. Configurar volume persistente ou migrar para PostgreSQL.
9. Adicionar validação de existência de pneu antes de salvar uma leitura.
10. Adicionar testes automatizados para API, predição e componentes principais.

## 11. Estado final registrado

- Backend FastAPI implementado.
- Banco SQLAlchemy implementado.
- Modelo de Machine Learning versionado.
- MQTT implementado.
- Dashboard React criado.
- `App.jsx` conectado ao Dashboard.
- `node_modules` e `dist` protegidos no `.gitignore`.
- Dashboard compilando com sucesso.
- Vite funcionando em `http://localhost:5173`.
- Console do navegador sem erros vermelhos.
- API Railway respondendo `200 OK`.
- Banco Railway ainda vazio, retornando `[]` em `/maquinas` e `/alertas`.
- Console web Railway sem aceitar entrada.
- Railway CLI instalada e autenticada.
- Chave SSH registrada.
- SSH bloqueado por timeout na porta 22.
- Seed de produção ainda pendente.
