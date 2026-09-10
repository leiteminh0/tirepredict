# 📋 DOCUMENTAÇÃO COMPLETA - TIREPREDICT

**Última atualização**: 2026-09-10  
**Status**: Projeto em desenvolvimento com Backend + Frontend integrados

---

## 📑 ÍNDICE
1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Arquitetura Geral](#arquitetura-geral)
3. [Backend - Python/FastAPI](#backend---pythonfastapi)
4. [Frontend - React/Vite](#frontend---reactvite)
5. [Fluxo de Dados](#fluxo-de-dados)
6. [Dependências](#dependências)
7. [Como Está Estruturado](#como-está-estruturado)
8. [Modo de Execução](#modo-de-execução)

---

## 🎯 Visão Geral do Projeto

### O que é TirePredict?

**TirePredict** é um sistema inteligente de **monitoramento e previsão de risco em pneus** de máquinas agrícolas (especialmente tratores).

**Objetivo Principal**: 
- Receber dados de sensores (pressão, temperatura, horas de uso)
- Armazenar essas leituras em banco de dados
- Usar Machine Learning para prever o risco de falha
- Exibir em tempo real um dashboard com alertas

**Problema que resolve**:
- Máquinas agrícolas quebram por falha de pneus
- Sem monitoramento, o dano é descoberto quando falha (perde-se tempo/dinheiro)
- TirePredict previne isso alertando ANTES da falha acontecer

**Público-alvo**: Proprietários de frotas agrícolas, oficinas, empresas de manutenção

---

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                       TIREPREDICT                           │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                      │
│   BACKEND (Python)   │      FRONTEND (React/Vite)          │
│   ┌──────────────┐   │      ┌──────────────────────┐       │
│   │ FastAPI      │   │      │ Dashboard React      │       │
│   │ Port: 8000   │   │      │ Port: 5173 (dev)     │       │
│   │              │   │      │                      │       │
│   │ - API REST   │───┼─────→│ - Máquinas           │       │
│   │ - Rotas      │   │      │ - Pneus              │       │
│   │ - ML Model   │   │      │ - Alertas            │       │
│   │ - MQTT Sub   │   │      │ - Gráficos           │       │
│   │ - BD         │   │      │ - Análise de risco   │       │
│   └──────────────┘   │      └──────────────────────┘       │
│        ▼             │             ▲                        │
│   ┌──────────────┐   │      ┌──────────────┐              │
│   │  SQLite      │   │      │  Axios       │              │
│   │  tirepredict │   │      │  (HTTP)      │              │
│   │  .db         │   │      └──────────────┘              │
│   └──────────────┘   │                                    │
│                      │                                    │
│   ┌──────────────┐   │                                    │
│   │  ML Model    │   │                                    │
│   │  Random      │   │                                    │
│   │  Forest      │   │                                    │
│   │  .pkl        │   │                                    │
│   └──────────────┘   │                                    │
└──────────────────────┴──────────────────────────────────────┘

COMUNICAÇÃO: HTTP REST com CORS ativado
DEPLOY: Backend na Railway, Frontend local (ou servido pelo Backend)
```

---

## 🔧 Backend - Python/FastAPI

### 📂 Estrutura de Arquivos Backend

```
backend/
├── main.py                 # 🔴 Aplicação FastAPI (rotas + servidor)
├── database.py             # 🔵 Configuração SQLAlchemy + conexão BD
├── models.py               # 🟢 Modelos de dados (Maquina, Pneu, Leitura)
├── predicao.py             # 🟡 Modelo ML de previsão de risco
├── mqtt_subscriber.py      # 🟣 Subscriber MQTT para receber dados
├── seed.py                 # 🟠 Script para popular dados iniciais
├── modelo_pneu.pkl        # 📦 Modelo Random Forest serializado
└── (gerado) tirepredict.db # 💾 Banco de dados SQLite
```

### 🔴 main.py - Aplicação FastAPI

**O coração do backend.** Define todas as rotas API.

#### Inicialização:
```python
app = FastAPI(title="TirePredict API")

# CORS permite que o React localhost:5173 chame http://localhost:8000
app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Na inicialização, cria tabelas se não existirem
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
```

#### Rotas Implementadas:

| Rota | Método | Descrição | Entrada | Saída |
|------|--------|-----------|---------|-------|
| `/` | GET | Verifica se API está online | Nenhuma | `{"status": "TirePredict online"}` |
| `/maquinas` | GET | Lista todas as máquinas | Nenhuma | Array de Maquinas |
| `/pneus/{maquina_id}` | GET | Lista pneus de uma máquina | Path: `maquina_id` (int) | Array de Pneus |
| `/leituras/{pneu_id}/recentes` | GET | Últimas 100 leituras de um pneu | Path: `pneu_id` (int) | Array de Leituras |
| `/alertas` | GET | Leituras críticas (pressão < 30) | Nenhuma | Array de Leituras críticas |
| `/leituras` | POST | Salva uma leitura manual | JSON: `{pneu_id, pressao, temperatura}` | `{"status": "salvo", "id": ...}` |
| `/prever` | POST | Prevê risco usando ML | JSON: `{pneu_id, pressao, temperatura, horas_uso}` | `{nivel, probabilidade, acao_recomendada}` |

#### Exemplos de Requisições:

**Salvar leitura (POST /leituras):**
```json
{
  "pneu_id": 1,
  "pressao": 22.5,
  "temperatura": 45.3
}
```

**Fazer previsão (POST /prever):**
```json
{
  "pneu_id": 1,
  "pressao": 22.5,
  "temperatura": 45.3,
  "horas_uso": 150.5
}
```

**Resposta de previsão:**
```json
{
  "nivel": "ALTO",
  "probabilidade": 0.83,
  "acao_recomendada": "Verificar o pneu imediatamente."
}
```

---

### 🔵 database.py - Configuração do Banco

**Gerencia a conexão e sessões com o banco de dados.**

#### Características:
- **ORM**: SQLAlchemy 2.0
- **Banco**: SQLite para desenvolvimento
- **Pool**: Configuração automática (SQLite não usa pool, PostgreSQL sim)
- **Ambiente**: Lê variável `DATABASE_URL` ou usa SQLite local

```python
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tirepredict.db")

# Desenvolvimento: SQLite local (sem pooling)
if _is_sqlite:
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False},
    )

# Produção: PostgreSQL com pooling robusto
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_pre_ping=True,
    )
```

#### SessionLocal:
- Cria uma nova sessão para cada requisição
- Garante que a sessão seja fechada após a requisição

#### Função get_db():
```python
def get_db():
    db = SessionLocal()
    try:
        yield db  # Disponibiliza a sessão para a rota
    finally:
        db.close()  # Fecha após a rota terminar
```

---

### 🟢 models.py - Modelos de Dados

**Define a estrutura das tabelas no banco de dados.**

#### Maquina
```python
class Maquina(Base):
    __tablename__ = "maquinas"
    id: Primary Key
    nome: String
    modelo: String
```
Exemplo: `Maquina(nome="Trator John Deere", modelo="6110J")`

#### Pneu
```python
class Pneu(Base):
    __tablename__ = "pneus"
    id: Primary Key
    maquina_id: FK → Maquina.id
    posicao: String
```
Exemplo: `Pneu(maquina_id=1, posicao="dianteiro_esquerdo")`

#### Leitura
```python
class Leitura(Base):
    __tablename__ = "leituras"
    id: Primary Key
    pneu_id: FK → Pneu.id
    pressao: Float
    temperatura: Float
    timestamp: DateTime (default: agora)
```
Exemplo: `Leitura(pneu_id=1, pressao=22.5, temperatura=45.3)`

**Relacionamento:**
```
Maquina (1) ──→ (N) Pneu ──→ (N) Leitura
1 máquina     4 pneus      Muitas leituras por pneu
```

---

### 🟡 predicao.py - Modelo de Machine Learning

**Usa um modelo Random Forest treinado para prever risco de falha.**

```python
import joblib
import numpy as np

# Carrega o modelo salvo em arquivo .pkl
modelo = joblib.load("modelo_pneu.pkl")

def prever_risco(pressao: float, temperatura: float, horas_uso: float):
    # Prepara entrada como array numpy
    entrada = np.array([[pressao, temperatura, horas_uso]])
    
    # Predição: retorna o label (BAIXO, MEDIO, ALTO)
    predicao = modelo.predict(entrada)[0]
    
    # Probabilidades: confiança da predição
    probabilidades = modelo.predict_proba(entrada)[0]
    probabilidade_max = float(max(probabilidades))
    
    # Ação recomendada conforme nível
    acoes = {
        "BAIXO": "Pneu dentro dos parâmetros normais.",
        "MEDIO": "Monitorar o pneu nas próximas horas.",
        "ALTO": "Verificar o pneu imediatamente."
    }
    
    return {
        "nivel": predicao,
        "probabilidade": round(probabilidade_max, 2),
        "acao_recomendada": acoes[predicao]
    }
```

**Modelo Treinado**: `modelo_pneu.pkl`
- Algoritmo: Random Forest
- Features (entrada): pressao, temperatura, horas_uso
- Classes (saída): BAIXO, MEDIO, ALTO
- Status: Pré-treinado, pronto para usar

---

### 🟣 mqtt_subscriber.py - Receptor de Dados via MQTT

**Conecta a um broker MQTT e recebe leituras de sensores em tempo real.**

```python
import paho.mqtt.client as mqtt
import json

MQTT_HOST = os.getenv("MQTT_HOST")  # ex: "broker.mqtt.org"
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "tirepredict/leituras")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Conectado ao broker {MQTT_HOST}")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"Falha ao conectar: {rc}")

def on_message(client, userdata, msg):
    try:
        # Recebe JSON: {"pneu_id": 1, "pressao": 22.5, "temperatura": 45}
        dados = json.loads(msg.payload.decode())
        salvar_leitura(dados)  # Salva no banco
    except Exception as e:
        print(f"Erro ao processar mensagem: {e}")
```

**Como funciona:**
1. Conecta ao broker MQTT
2. Inscreve-se no tópico `tirepredict/leituras`
3. Recebe mensagens JSON com dados de sensores
4. Salva automaticamente no banco de dados
5. Reconecta automaticamente se desconectar

**Modo de ativação**: Executa em thread separada (não bloqueia a API)

---

### 🟠 seed.py - Popula Dados Iniciais

**Script para inicializar o banco com dados de teste.**

A rota `POST /seed` faz isso automaticamente:
- Cria 1 máquina: "Trator John Deere 6110J"
- Cria 4 pneus: dianteiro_esquerdo, dianteiro_direito, traseiro_esquerdo, traseiro_direito
- Operação idempotente: se já existem dados, não duplica

---

## ⚛️ Frontend - React/Vite

### 📂 Estrutura de Arquivos Frontend

```
frontend/
├── package.json                    # Dependências Node.js
├── vite.config.js                  # Configuração Vite
├── index.html                      # HTML raiz
├── public/                         # Arquivos estáticos
├── src/
│   ├── main.jsx                    # Entrada React
│   ├── App.jsx                     # 🔴 Componente raiz com rotas
│   ├── App.css                     # Estilos globais
│   ├── index.css                   # Reset CSS
│   │
│   ├── services/
│   │   ├── api.js                  # 🔵 Cliente HTTP com Axios
│   │   └── mockData.js             # Dados de teste (fallback)
│   │
│   ├── pages/
│   │   ├── Frota.jsx               # 📄 Lista de máquinas
│   │   ├── Dashboard.jsx           # 📊 Detalhes de uma máquina
│   │   ├── Alertas.jsx             # ⚠️ Página de alertas
│   │   └── *.css                   # Estilos de cada página
│   │
│   ├── components/
│   │   ├── Sidebar.jsx             # 🟣 Navegação lateral
│   │   ├── Topbar.jsx              # 🟠 Barra superior
│   │   ├── CardPneu.jsx            # 🟡 Card de pneu com status
│   │   ├── CardAlerta.jsx          # 🔴 Card de alerta
│   │   ├── GraficoPressao.jsx      # 📈 Gráfico de pressão
│   │   ├── PainelAlertas.jsx       # 📋 Painel de alertas
│   │   ├── StatCard.jsx            # 📊 Card de estatística
│   │   ├── ThemeToggle.jsx         # 🌓 Toggle claro/escuro
│   │   └── *.css                   # Estilos de cada componente
│   │
│   └── assets/                     # Imagens, ícones, etc.
```

### 🔴 App.jsx - Roteamento Principal

**Configura todas as rotas da aplicação.**

```javascript
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/frota" replace />} />
            <Route path="/frota" element={<Frota />} />
            <Route path="/maquinas/:maquinaId/dashboard" element={<Dashboard />} />
            <Route path="/maquinas/:maquinaId/alertas" element={<Alertas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

**Rotas implementadas:**
- `/` → Redireciona para `/frota`
- `/frota` → Lista todas as máquinas (Frota.jsx)
- `/maquinas/:maquinaId/dashboard` → Dashboard de uma máquina (Dashboard.jsx)
- `/maquinas/:maquinaId/alertas` → Alertas de uma máquina (Alertas.jsx)

---

### 🔵 api.js - Cliente HTTP

**Centraliza todas as chamadas à API backend.**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://tirepredict-production.up.railway.app',
});

// Funções de chamada à API
export const listarMaquinas = () => api.get('/maquinas');
export const listarPneus = (maquinaId) => api.get(`/pneus/${maquinaId}`);
export const listarLeituras = (pneuId) => api.get(`/leituras/${pneuId}/recentes`);
export const listarAlertas = () => api.get('/alertas');
export const criarLeitura = (dados) => api.post('/leituras', dados);
export const preverRisco = (dados) => api.post('/prever', dados);
```

**Funções Auxiliares:**

```javascript
// Formata posição: "dianteiro_esquerdo" → "dianteiro esquerdo"
const formatarPosicao = (posicao) => posicao.replaceAll('_', ' ');

// Classifica risco pela pressão
const classificarRisco = (pressao) => {
  if (pressao == null) return 'BAIXO';
  if (pressao < 25) return 'ALTO';
  if (pressao < 30) return 'MEDIO';
  return 'BAIXO';
};

// Formata timestamp para hora legível
const formatarHora = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
```

**Função Complexa - listarFrota():**

Orquestra múltiplas chamadas à API:
```javascript
export async function listarFrota() {
  // 1. Busca todas as máquinas
  const { data: maquinas } = await listarMaquinas();
  
  // 2. Para cada máquina, busca seus pneus
  return Promise.all(maquinas.map(async (maquina) => {
    const { data: pneus } = await listarPneus(maquina.id);
    
    // 3. Para cada pneu, busca suas leituras
    const pneusComLeituras = await Promise.all(
      pneus.map(async (pneu) => {
        const { data: leituras } = await listarLeituras(pneu.id);
        
        // 4. Prepara dados para o frontend
        return {
          ...pneu,
          posicao: formatarPosicao(pneu.posicao),
          pressao: leituras[0]?.pressao,
          temperatura: leituras[0]?.temperatura,
          nivel: classificarRisco(leituras[0]?.pressao),
          historico: leituras.map(l => ({
            hora: formatarHora(l.timestamp),
            pressao: l.pressao
          }))
        };
      })
    );
    
    return {
      ...maquina,
      pneus: pneusComLeituras
    };
  }));
}
```

---

### 📄 Frota.jsx - Lista de Máquinas

**Exibe todas as máquinas monitoradas.**

- Chama `listarFrota()` ao montar
- Exibe cada máquina em um card
- Mostra status de cada pneu (crítico, médio, normal)
- Permite navegar para dashboard de uma máquina

---

### 📊 Dashboard.jsx - Detalhes de uma Máquina

**Exibe análise completa de uma máquina.**

**Componentes exibidos:**
1. **Topbar**: Nome da máquina, modelo, última leitura
2. **Stats Row**: Contadores de pneus por status
3. **Cards de Pneus**: 4 cards com pressão, temperatura, nível de risco
4. **Gráfico**: Pressão ao longo do tempo (se um pneu estiver selecionado)
5. **Painel de Alertas**: Recomendações de ação

**Estado gerenciado:**
```javascript
const [selecionadoId, setSelecionadoId] = useState(pneus[0]?.id);
```
Quando clica num pneu, ele fica selecionado e seu gráfico é exibido.

---

### 📈 GraficoPressao.jsx - Gráfico de Pressão

**Usa biblioteca Recharts para exibir pressão ao longo do tempo.**

```javascript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function GraficoPressao({ posicao, dados }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dados}>
        <XAxis dataKey="hora" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="pressao" stroke="#4CAF50" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Entrada**: Array de `{hora, pressao}`

---

### 🟡 CardPneu.jsx - Card de Pneu

**Componente reutilizável que exibe status de um pneu.**

```javascript
const CONFIG_RISCO = {
  ALTO: { cor: "red", fundo: "rgba(255,0,0,0.2)", texto: "Alto", icone: "⚠" },
  MEDIO: { cor: "orange", fundo: "rgba(255,165,0,0.2)", texto: "Médio", icone: "⏱" },
  BAIXO: { cor: "green", fundo: "rgba(0,255,0,0.2)", texto: "Normal", icone: "✓" },
};

export default function CardPneu({ 
  posicao, pressao, temperatura, nivel, selecionado, onClick 
}) {
  const cfg = CONFIG_RISCO[nivel];
  
  return (
    <button className={`card-pneu ${selecionado ? 'selecionado' : ''}`} onClick={onClick}>
      <span className="card-pneu-posicao">{posicao}</span>
      <span className="card-pneu-pressao">{pressao} PSI</span>
      <span className="card-pneu-temp">{temperatura}°C</span>
      <span className="card-pneu-badge" style={{ background: cfg.cor }}>
        {cfg.icone} {cfg.texto}
      </span>
    </button>
  );
}
```

**Props:**
- `posicao`: Localização do pneu (ex: "dianteiro esquerdo")
- `pressao`: Valor em PSI
- `temperatura`: Valor em °C
- `nivel`: "BAIXO", "MEDIO" ou "ALTO"
- `selecionado`: Boolean (destaca se selecionado)
- `onClick`: Função chamada quando clicado

---

### 🟣 Sidebar.jsx - Navegação Lateral

**Menu lateral com opções de navegação.**

- **Logo/Nome da empresa**
- **Links de navegação**:
  - Frota (ícone: ▣)
  - Dashboard (ícone: ◫)
  - Alertas (ícone: ⚑)
- **ThemeToggle**: Botão para alternar tema claro/escuro
- **Status do sistema**: "Sistema ativo"

**Implementação de tema:**
```javascript
const [tema, setTema] = useState('escuro');

const toggle = () => {
  const novoTema = tema === 'escuro' ? 'claro' : 'escuro';
  setTema(novoTema);
  document.documentElement.setAttribute('data-theme', novoTema);
};
```

---

### 🟠 Topbar.jsx - Barra Superior

**Exibe informações contextuais no topo da página.**

- Nome da máquina
- Modelo
- Última leitura
- Botão "voltar"

```javascript
export default function Topbar({ trator, modelo, ultimaLeitura, voltarPara }) {
  return (
    <div className="topbar">
      <h1>{trator}</h1>
      <p>{modelo} • Última leitura: {ultimaLeitura}</p>
      <Link to={voltarPara}>← Voltar</Link>
    </div>
  );
}
```

---

### 📋 PainelAlertas.jsx - Painel de Alertas

**Exibe alertas e insights de IA.**

```javascript
export default function PainelAlertas({ alertas, insightIA }) {
  return (
    <div className="painel-alertas">
      <h3>Alertas Críticos</h3>
      {alertas.map(alerta => (
        <CardAlerta key={alerta.id} {...alerta} />
      ))}
      
      <div className="insight-ia">
        <h4>🤖 Insight de IA</h4>
        <p>{insightIA.texto}</p>
        <small>Fonte: {insightIA.fonte}</small>
      </div>
    </div>
  );
}
```

---

### 📊 StatCard.jsx - Card de Estatística

**Componente pequeno reutilizável para exibir números.**

```javascript
export default function StatCard({ label, valor, cor }) {
  return (
    <div className="stat-card" style={{ borderColor: cor }}>
      <p className="stat-label">{label}</p>
      <p className="stat-valor" style={{ color: cor }}>{valor}</p>
    </div>
  );
}
```

Usado no Dashboard para exibir:
- Pneus monitorados: 4
- Em risco alto: 0
- Em risco médio: 0
- Normais: 4

---

### 🌓 ThemeToggle.jsx - Alternador de Tema

**Botão para mudar entre tema claro e escuro.**

```javascript
export default function ThemeToggle() {
  const [temaNocivo, setTemaNocivo] = useState(false);
  
  const toggle = () => {
    setTemaNocivo(!temaNocivo);
    document.documentElement.classList.toggle('dark-mode');
  };
  
  return <button onClick={toggle}>{temaNocivo ? '☀️' : '🌙'}</button>;
}
```

---

## 🔄 Fluxo de Dados

### Cenário 1: Usuário abre a aplicação

```
1. Navegador carrega http://localhost:5173
2. React renderiza App.jsx
3. Usuário é redirecionado para /frota
4. Frota.jsx monta
5. useEffect() chama listarFrota()
6. listarFrota() faz requisições:
   a) GET http://localhost:8000/maquinas
      → Retorna: [{ id: 1, nome: "Trator", modelo: "6110J" }]
   
   b) Para cada máquina, GET http://localhost:8000/pneus/1
      → Retorna: [
          { id: 1, maquina_id: 1, posicao: "dianteiro_esquerdo" },
          { id: 2, maquina_id: 1, posicao: "dianteiro_direito" },
          ...
        ]
   
   c) Para cada pneu, GET http://localhost:8000/leituras/1/recentes
      → Retorna: [
          { id: 1, pneu_id: 1, pressao: 22.5, temperatura: 45, timestamp: "2024-01-10T14:30:00" },
          { id: 2, pneu_id: 1, pressao: 22.4, temperatura: 45.1, timestamp: "2024-01-10T14:25:00" },
          ...
        ]

7. Dados são formatados:
   - Posição: "dianteiro_esquerdo" → "dianteiro esquerdo"
   - Risco: classificarRisco(22.5) → "MEDIO"
   - Hora: "2024-01-10T14:30:00" → "14:30"

8. Estado React é atualizado
9. Componentes re-renderizam com novos dados
10. Usuário vê lista de máquinas com status dos pneus
```

### Cenário 2: Usuário clica em uma máquina

```
1. Clica no card da máquina
2. Navega para /maquinas/1/dashboard
3. Dashboard.jsx monta
4. useParams() extrai maquinaId = 1
5. Busca dados em mockData (ou chamaria API)
6. Renderiza:
   - Topbar com nome da máquina
   - 4 StatCards com contadores
   - 4 CardPneu em grid
   - Se clicar em um pneu, GraficoPressao mostra histórico
```

### Cenário 3: Dados chegam via MQTT

```
1. Sensor envia para broker MQTT:
   Tópico: "tirepredict/leituras"
   Payload: {"pneu_id": 1, "pressao": 22.3, "temperatura": 45.2}

2. Backend mqtt_subscriber.py recebe
3. on_message() é acionado
4. Desserializa JSON
5. Chama salvar_leitura(dados)
6. Uma nova Leitura é criada no banco:
   INSERT INTO leituras (pneu_id, pressao, temperatura, timestamp)
   VALUES (1, 22.3, 45.2, NOW())

7. Frontend continua exibindo dados (não atualiza em tempo real neste projeto)
   (Para real-time, seria necessário WebSocket ou polling)
```

### Cenário 4: Usuário quer prever risco

```
1. Frontend chama POST /prever com:
   { "pneu_id": 1, "pressao": 22.5, "temperatura": 45, "horas_uso": 150 }

2. Backend recebe em main.py rota POST /prever
3. Chama predicao.prever_risco(22.5, 45, 150)
4. predicao.py:
   a) Cria array numpy: [[22.5, 45, 150]]
   b) Carrega modelo Random Forest
   c) Faz predict() → retorna label ("ALTO", "MEDIO", "BAIXO")
   d) Faz predict_proba() → retorna confiança [0.1, 0.2, 0.7]
   e) Monta resposta com nivel, probabilidade, ação

5. Frontend recebe:
   {
     "nivel": "ALTO",
     "probabilidade": 0.83,
     "acao_recomendada": "Verificar o pneu imediatamente."
   }

6. Mostra alerta para usuário
```

---

## 📦 Dependências

### Backend (Python)

```
fastapi==0.141.1              # Framework web
uvicorn==0.52.1               # Servidor ASGI
SQLAlchemy==2.0.51            # ORM para BD
psycopg2-binary==2.9.12       # Driver PostgreSQL
pydantic==2.13.4              # Validação de dados
python-dotenv==1.2.2          # Variáveis de ambiente
paho-mqtt==2.1.0              # Cliente MQTT
joblib==1.5.3                 # Serialização de modelos ML
numpy==2.5.1                  # Operações numéricas
scikit-learn==1.9.0           # Machine Learning
scipy==1.18.0                 # Cálculos científicos
```

**Por quê cada uma:**
- **fastapi + uvicorn**: Framework leve e rápido para APIs REST
- **SQLAlchemy**: ORM que abstrai banco de dados (SQLite dev, PostgreSQL prod)
- **pydantic**: Validação automática de dados (JSON schema)
- **paho-mqtt**: Recebe dados de sensores via protocolo MQTT
- **joblib + scikit-learn**: ML - carrega e executa modelo treinado
- **numpy + scipy**: Cálculos numéricos para o modelo

### Frontend (Node.js)

```json
{
  "dependencies": {
    "axios": "^1.19.0",              // Cliente HTTP
    "react": "^19.2.8",              // Framework UI
    "react-dom": "^19.2.8",          // Renderização DOM
    "react-router-dom": "^7.18.2",   // Roteamento SPA
    "recharts": "^3.10.1"            // Gráficos
  },
  "devDependencies": {
    "vite": "^8.2.0",                // Bundler/dev server
    "@vitejs/plugin-react": "^6.0.4" // Plugin React para Vite
  }
}
```

**Por quê cada uma:**
- **React**: Componentes reutilizáveis, reatividade
- **React Router**: Navegação entre páginas sem recarregar
- **Axios**: Chamadas HTTP simples e elegantes
- **Recharts**: Gráficos lindos e responsivos
- **Vite**: Bundler rápido, dev server com HMR (recarregamento quente)

---

## 📍 Como Está Estruturado

### Separação de Responsabilidades

```
BACKEND (Servidor)
├── Recebe dados (API REST + MQTT)
├── Armazena no banco
├── Executa ML
└── Retorna análises

FRONTEND (Cliente)
├── Renderiza interface
├── Faz requisições HTTP
├── Exibe dados em tempo real
└── Interage com usuário
```

### Comunicação Entre Eles

**Desenvolvimento (2 servidores):**
```
Frontend: http://localhost:5173
   ↓ (Axios HTTP)
Backend:  http://localhost:8000
   ↓ (FastAPI rotas)
Banco:    ./tirepredict.db
```

**Produção (1 servidor):**
```
Backend server (http://tirepredict-production.up.railway.app)
├── Rotas API (/maquinas, /pneus, /leituras, /prever, etc)
└── Arquivos estáticos (frontend build)
     └── /dist/index.html
     └── /dist/assets/*.js
     └── /dist/assets/*.css
```

### Estrutura de Pastas Atual

```
tirepredict/
├── backend/               (Código Python)
│   ├── main.py            (App FastAPI)
│   ├── database.py        (BD)
│   ├── models.py          (Tabelas)
│   ├── predicao.py        (ML)
│   ├── mqtt_subscriber.py (MQTT)
│   └── modelo_pneu.pkl    (Modelo treinado)
│
├── frontend/              (Código React)
│   ├── src/
│   │   ├── App.jsx        (Rotas)
│   │   ├── pages/         (Páginas)
│   │   ├── components/    (Componentes)
│   │   └── services/      (API)
│   ├── package.json
│   └── vite.config.js
│
├── requirements.txt       (Deps Python)
├── README.md              (Docs)
└── railway.toml           (Config deploy Railway)
```

---

## 🚀 Modo de Execução

### Desenvolvimento (2 portas)

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --reload
# API rodando em http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Interface em http://localhost:5173
```

**Como funciona:**
- Frontend carrega em `localhost:5173`
- Faz requisições para `localhost:8000` (CORS ativado)
- Editar arquivo Python recarrega API automaticamente (`--reload`)
- Editar arquivo React recarrega interface automaticamente (HMR do Vite)

---

### Produção (1 porta)

**Opção 1: Backend serve Frontend estático**

1. Build frontend:
   ```bash
   cd frontend
   npm run build  # Cria dist/ com HTML, JS, CSS minificados
   ```

2. Backend serve a pasta:
   ```python
   from fastapi.staticfiles import StaticFiles
   
   app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
   ```

3. Uma única porta `http://tirepredict-production.up.railway.app`

**Opção 2: Deploy separado (atual na Railway)**
- Backend: Railway
- Frontend: Netlify/Vercel/GitHub Pages
- Comunicam via HTTP CORS

---

## 📝 Resumo Executivo

| Aspecto | Descrição |
|--------|-----------|
| **Projeto** | Sistema inteligente de monitoramento de pneus em máquinas agrícolas |
| **Backend** | Python/FastAPI com banco SQLAlchemy + ML Random Forest |
| **Frontend** | React/Vite com gráficos Recharts e roteamento React Router |
| **Banco** | SQLite (dev) ou PostgreSQL (prod) |
| **API** | 7 rotas REST: listar máquinas, pneus, leituras, alertas, previsões |
| **ML** | Random Forest pré-treinado prevê risco em 3 níveis |
| **MQTT** | Subscriber para receber dados de sensores em tempo real |
| **Deploy** | Backend na Railway, frontend pode ser integrado ou separado |
| **Status** | ✅ Funcional, backend + frontend rodando e comunicando |

---

**Documento criado em**: 2026-09-10  
**Versão**: 1.0  
**Autor**: Documentação Técnica Automática
