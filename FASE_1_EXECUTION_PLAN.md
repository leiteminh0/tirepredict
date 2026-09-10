# 🚀 FASE 1: Dashboard Operacional - Plano de Execução Detalhado

## ⏱️ Estimativa Total: 12 horas (1-2 dias)

---

## 🎯 TAREFA 1: Seed Script Robusto para PostgreSQL (1 hora)

### Status Atual
- ✅ PostgreSQL 18 rodando em Railway com volume persistente
- ✅ Backend conecta via `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- ❌ Banco vazio: `/maquinas` retorna `[]`
- ❌ `seed.py` existente, mas nunca foi executado em produção

### O Que Fazer

**Criar novo arquivo** `backend/seed_prod.py`:

```python
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
```

### Teste Local
```bash
cd /root/repo

# Teste com SQLite (local dev)
export DATABASE_URL="sqlite:///./test.db"
python backend/seed_prod.py

# Saída esperada:
# ✅ Tabelas verificadas/criadas
# ✅ Máquina criada (ID=1)
#   ✅ Pneu dianteiro_esquerdo criado (ID=1)
#   ✅ Pneu dianteiro_direito criado (ID=2)
#   ...
# ✅✅✅ SEED CONCLUÍDO COM SUCESSO ✅✅✅
# Sumário final:
#   Máquinas: 1
#   Pneus: 4
#   Leituras: 24
```

### Executar em Produção (Railway)
**Opção A: Via Railway CLI (AGORA)**
```bash
# Local machine
railway login
railway link  # Seleciona projeto
railway run python backend/seed_prod.py
```

**Opção B: Via deploy pre-command (Próximo deploy)**
Editar `railway.toml`:
```toml
[deploy]
startCommand = "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"
preDeployCommand = "python backend/seed_prod.py"
```

### Validar em Produção
Após executar:
```bash
curl https://tirepredict-production.up.railway.app/maquinas
# Esperado: [{"id": 1, "nome": "Trator John Deere", "modelo": "6110J"}]

curl https://tirepredict-production.up.railway.app/pneus/1
# Esperado: 4 pneus

curl https://tirepredict-production.up.railway.app/alertas
# Esperado: 2 leituras com pressao < 30
```

---

## 🎯 TAREFA 2: Deploy do Frontend em Railway (2 horas)

### Status Atual
- ✅ Frontend React compila sem erros
- ✅ Roda localmente em `http://localhost:5173`
- ❌ NÃO está deployado na Railway
- ❌ API base ainda hardcoded para Railway (OK por enquanto)

### O Que Fazer

**PASSO 1: Preparar Vite para produção** (30 min)

Editar `frontend/vite.config.js` (criar se não existir):
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,  // Segurança: não expõe source em prod
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

Editar `frontend/package.json`:
```json
{
  "name": "tirepredict-frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "oxlint"
  },
  "dependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "axios": "^1.7.0",
    "react-router-dom": "^7.18.2",
    "recharts": "^3.10.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.4",
    "vite": "^8.2.0",
    "oxlint": "^1.75.0"
  }
}
```

**PASSO 2: Criar serviço de frontend em Railway** (30 min)

Via Railway dashboard:
1. Ir para projeto TirePredict
2. "+ New Service" → "GitHub Repo"
3. Conectar branch `main` (ou criar variante `frontend` do repo)
4. Build settings:
   ```
   Root Directory: frontend
   Build Command: npm run build
   Start Command: npm run preview
   ```
5. Networking:
   ```
   Service Domain: tirepredict-frontend.up.railway.app
   Port: 4173  (Vite preview port)
   ```

**PASSO 3: Adicionar frontend como subdiretório no repo** (1 hora)

Opção recomendada: Monorepo single-deploy
```
tirepredict/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── seed_prod.py
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── requirements.txt
└── railway.toml  # Aponta só pro backend

# + Criar railway-frontend.toml pra frontend
```

Criar `railway-frontend.toml`:
```toml
[project]
id = "d7309550-1118-4503-add3-904ffbbb0993"
name = "giving-spirit"

[build]
builder = "nixpacks"
buildCommand = "cd frontend && npm run build"

[deploy]
startCommand = "cd frontend && npm run preview"
```

**OU usar estratégia simples**: Deploy frontend separado
- Se quiser, criar novo serviço Railway apenas pro frontend
- Points to: mesmo repo, mas `railway.toml` aponta `rootDirectory = "frontend"`

### Teste Local
```bash
cd frontend
npm install
npm run build
npm run preview

# Abrir http://localhost:4173
# Deve mostrar dashboard (vazio por enquanto, ou com seed)
```

### Deploy em Railway
```bash
# Via Railway CLI
railway link  # Se não fez ainda
railway up    # Deploy automático

# OU via dashboard:
# Criar novo serviço → GitHub → mesmo repo
# Config: rootDirectory = "frontend"
```

---

## 🎯 TAREFA 3: Autenticação JWT Básica (4 horas)

### Status Atual
- ❌ API é aberta (permite qualquer requisição)
- ❌ Sem autenticação
- ✅ Backend pode usar `python-jwt` (adicionar a requirements.txt)

### O Que Fazer

**PASSO 1: Adicionar dependência** (5 min)

Editar `requirements.txt`:
```
fastapi==0.141.1
uvicorn==0.52.1
SQLAlchemy==2.0.51
psycopg2-binary==2.9.12
pydantic==2.13.4
python-dotenv==1.2.2
paho-mqtt==2.1.0
joblib==1.5.3
numpy==2.5.1
scikit-learn==1.9.0
scipy==1.18.0
PyJWT==2.8.1          # ← NOVO
python-multipart==0.0.6  # ← NOVO (para forms)
```

**PASSO 2: Criar módulo de auth** (1.5 horas)

Criar `backend/auth.py`:
```python
"""
Autenticação JWT simples e segura.

Padrão de uso:
  @app.post("/login")
  def login(credentials: LoginInput):
      token = create_access_token(user_id=1, expires_delta=timedelta(hours=24))
      return {"access_token": token, "token_type": "bearer"}

  @app.get("/protected")
  def protected_route(current_user: int = Depends(get_current_user)):
      return {"user_id": current_user}
"""

import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials

# Configuração
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))

security = HTTPBearer()


def create_access_token(user_id: int, expires_delta: timedelta = None) -> str:
    """
    Cria um token JWT assinado.
    
    Args:
        user_id: ID do usuário (ex: 1 para admin)
        expires_delta: Tempo até expiração (padrão: 24h)
    
    Returns:
        Token JWT em string
    """
    if expires_delta is None:
        expires_delta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": str(user_id),
        "exp": expire.timestamp()
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> int:
    """
    Verifica e decodifica token JWT.
    
    Args:
        token: Token JWT
    
    Returns:
        user_id (int)
    
    Raises:
        HTTPException 401: Token inválido/expirado
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        return int(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )


async def get_current_user(credentials: HTTPAuthCredentials = Depends(security)) -> int:
    """
    Dependency para proteger rotas. Use em endpoints:
    
    @app.get("/protected")
    def protected(current_user: int = Depends(get_current_user)):
        return {"user_id": current_user}
    """
    return verify_access_token(credentials.credentials)


# ===== DEMO: Usuários hardcoded (substituir por DB depois) =====
DEMO_USERS = {
    "demo@tirepredict.com": "demo123",  # user_id = 1
    "admin@tirepredict.com": "admin123",  # user_id = 2
}


def verify_user_credentials(email: str, password: str) -> int | None:
    """Verifica credenciais demo (USAR DB EM PRODUÇÃO!)."""
    if email in DEMO_USERS and DEMO_USERS[email] == password:
        return 1 if email.startswith("demo") else 2  # Retorna user_id
    return None
```

**PASSO 3: Adicionar endpoint de login** (1 hora)

Editar `backend/main.py`, adicionar no final antes do seed:
```python
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import EmailStr, Field

# ===== IMPORT AUTH =====
try:
    from .auth import create_access_token, get_current_user, verify_user_credentials
except ImportError:
    from auth import create_access_token, get_current_user, verify_user_credentials


# ===== SCHEMAS =====
class LoginInput(BaseModel):
    email: str = Field(..., example="demo@tirepredict.com")
    password: str = Field(..., example="demo123")

class LoginOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400  # 24 horas em segundos


# ===== ENDPOINTS AUTENTICAÇÃO =====
@app.post("/login", response_model=LoginOutput, tags=["Auth"])
def login(credentials: LoginInput):
    """
    Faz login e retorna token JWT.
    
    **Credenciais Demo**:
    - Email: `demo@tirepredict.com` | Senha: `demo123`
    - Email: `admin@tirepredict.com` | Senha: `admin123`
    
    Use o token retornado em todas as requisições:
    ```
    Authorization: Bearer <seu_token_aqui>
    ```
    
    Returns:
        access_token: Token JWT para usar nas requisições
        token_type: Sempre "bearer"
        expires_in: Segundos até expiração
    """
    user_id = verify_user_credentials(credentials.email, credentials.password)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválido"
        )
    
    access_token = create_access_token(user_id=user_id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 86400
    }


# ===== ENDPOINTS PROTEGIDOS (Exemplo) =====
@app.get("/me", tags=["Auth"])
def get_current_user_info(current_user: int = Depends(get_current_user)):
    """
    Retorna informações do usuário atual (validando token).
    
    **Header Obrigatório**:
    ```
    Authorization: Bearer <token_jwt>
    ```
    """
    return {
        "user_id": current_user,
        "status": "autenticado"
    }


# ===== ENDPOINTS PÚBLICOS (SEM MUDANÇA) =====
# GET / — Público
# GET /maquinas — Público
# GET /pneus/{id} — Público
# GET /leituras/{id}/recentes — Público
# GET /alertas — Público
# GET /health — Público

# ===== ENDPOINTS PROTEGIDOS (PARA FUTURO) =====
# POST /leituras — Será protegido depois
# POST /prever — Será protegido depois
```

**PASSO 4: Atualizar frontend para usar token** (1 hora)

Editar `frontend/src/api/api.js`:
```javascript
import axios from 'axios'

const API_BASE = process.env.REACT_APP_API_URL || 'https://tirepredict-production.up.railway.app'

// Instância do Axios com interceptors
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

// Interceptor: Adiciona token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor: Redireciona pra login se 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ===== EXPORTS =====
export const login = (email, password) =>
  api.post('/login', { email, password })

export const getMaquinas = () =>
  api.get('/maquinas')

export const getPneus = (maquinaId) =>
  api.get(`/pneus/${maquinaId}`)

export const getLeituras = (pneuId) =>
  api.get(`/leituras/${pneuId}/recentes`)

export const getAlertas = () =>
  api.get('/alertas')

export const salvarLeitura = (pneuId, pressao, temperatura) =>
  api.post('/leituras', { pneu_id: pneuId, pressao, temperatura })

export const prever = (pneuId, pressao, temperatura, horasUso = 0) =>
  api.post('/prever', { pneu_id: pneuId, pressao, temperatura, horas_uso: horasUso })

export default api
```

Criar `frontend/src/pages/Login.jsx`:
```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginAPI } from '../api/api'
import '../styles/Login.css'

export default function Login() {
  const [email, setEmail] = useState('demo@tirepredict.com')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await loginAPI(email, password)
      localStorage.setItem('access_token', data.access_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🌾 TirePredict</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Conectando...' : 'Entrar'}
          </button>
        </form>
        <p>Demo: demo@tirepredict.com / demo123</p>
      </div>
    </div>
  )
}
```

Atualizar `frontend/src/App.jsx` para roteamento com proteção:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token')
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

Criar `frontend/src/styles/Login.css`:
```css
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-box h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
}

.login-box form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.login-box input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.login-box input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 5px rgba(102, 126, 234, 0.5);
}

.login-box button {
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.login-box button:hover:not(:disabled) {
  background: #764ba2;
}

.login-box button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-box .error {
  color: #d32f2f;
  font-size: 14px;
  text-align: center;
}

.login-box p {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin-top: 20px;
}
```

### Teste Local
```bash
# Terminal 1: Backend
cd backend
export DATABASE_URL="sqlite:///./test.db"
python backend/seed_prod.py
uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Abrir http://localhost:5173
# Deve mostrar tela de login
# Usar: demo@tirepredict.com / demo123
# Após login: dashboard com dados
```

---

## 🎯 TAREFA 4: Integração Real Dashboard ↔ API (3 horas)

### Status Atual
- ❌ Frontend aponta para API Railway (correto)
- ❌ Mas não há token de autenticação
- ❌ Dashboard não passa por login

### O Que Fazer

**PASSO 1: Adicionar variável de ambiente JWT_SECRET_KEY em Railway** (30 min)

Via Railway dashboard:
1. Serviço `tirepredict` → Variables
2. Adicionar:
   ```
   JWT_SECRET_KEY = ${{ secret(64) }}
   ACCESS_TOKEN_EXPIRE_HOURS = 24
   ```

**PASSO 2: Ajustar frontend para ambiente de produção** (1 hora)

Editar `frontend/.env.production`:
```env
REACT_APP_API_URL=https://tirepredict-production.up.railway.app
```

Editar `frontend/vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  define: {
    'import.meta.env.REACT_APP_API_URL': JSON.stringify(
      process.env.REACT_APP_API_URL || 'https://tirepredict-production.up.railway.app'
    ),
  },
})
```

**PASSO 3: Teste e-2-e completo** (1.5 horas)

```bash
# Local (simular produção)
1. Seed em SQLite:
   export DATABASE_URL="sqlite:///./prod_test.db"
   python backend/seed_prod.py

2. Start backend:
   export JWT_SECRET_KEY="test-secret-key-64-chars-min"
   uvicorn backend.main:app

3. Start frontend:
   npm run build
   npm run preview

4. Abrir http://localhost:4173
5. Login com: demo@tirepredict.com / demo123
6. Validar:
   ✅ Dashboard mostra máquina
   ✅ Pneus mostram último estado
   ✅ Gráfico renderiza com histórico
   ✅ Alertas mostram leituras críticas
```

**PASSO 4: Deploy integrado em produção** (30 min)

```bash
# Opção A: Commit única PR com:
git add .
git commit -m "feat(phase-1): seed script, jwt auth, dashboard integration"
git push origin main

# Opção B: PRs separadas (mais limpo):
# PR #1: seed_prod.py
# PR #2: auth.py + backend endpoints
# PR #3: frontend login + routing + api updates
```

---

## ✅ Checklist de Validação Final

### Local Dev
- [ ] `python backend/seed_prod.py` executa sem erro
- [ ] `uvicorn backend.main:app` inicia
- [ ] `npm run dev` no frontend funciona
- [ ] Login com `demo@tirepredict.com / demo123` redireciona pra dashboard
- [ ] Dashboard mostra "Trator John Deere"
- [ ] Gráfico renderiza com dados reais
- [ ] Console não tem erros vermelhos

### Railway Staging
- [ ] Seed executado em prod: `railway run python backend/seed_prod.py`
- [ ] `/maquinas` retorna dados
- [ ] `/login` retorna token válido
- [ ] Frontend deployado em `tirepredict-frontend.up.railway.app`
- [ ] Dashboard acessa API com autenticação
- [ ] Todos os 3 componentes (Frontend + Backend + ML) funcionam juntos

### Métricas de Sucesso
- ✅ **End-to-end funcional**: Login → Dashboard → Dados reais → Gráfico
- ✅ **Sem erros 5xx**: Todos endpoints retornam 2xx/4xx apropriado
- ✅ **Latência aceitável**: Carregamento dashboard < 2s
- ✅ **Token working**: Requisições autenticadas passam, sem auth falham
- ✅ **Dados persistem**: Seed idempotente, múltiplas execuções não duplicam

---

## 🎬 Timeline Executiva

| Hora | Tarefa | Dev | Status |
|------|--------|-----|--------|
| 0-1h | Seed script robusto | Dev Senior | 📝 Pronto |
| 1-3h | Deploy frontend Railway | Dev Senior | 📝 Pronto |
| 3-7h | Autenticação JWT | Dev Senior | 📝 Pronto |
| 7-10h | Integração & testes | Dev Senior | 📝 Pronto |
| 10-12h | Validação & QA | Dev Senior + Você | 📝 Pronto |

**Início**: AGORA  
**Término esperado**: 1-2 dias (fim semana ou segunda)

---

## 🚀 Próximas Fases

Depois de completar Fase 1:
- **Fase 2**: Estabilização (logging, testes, padrões) — informada por feedback real
- **Fase 3**: Features (MQTT real, mais métricas, alertas via email)
- **Fase 4**: Scale (cache Redis, multi-replica, observabilidade)

---

**Versão**: 1.0 (Fase 1 - Dashboard Operacional)  
**Data**: 2026-09-10  
**Status**: ✅ PRONTO PARA EXECUÇÃO

