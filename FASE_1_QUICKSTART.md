# ⚡ FASE 1: Quick Start (Copiar & Colar)

## 🚀 Começar AGORA

### Pré-requisito: Acesso à Railroad CLI
```bash
npm install -g @railway/cli
railway login
railway link  # Seleciona projeto TirePredict
```

---

## STEP 1️⃣: Seed em Produção (5 min)

```bash
# OPÇÃO A: Via CLI (RECOMENDADO - executa agora)
railway run python backend/seed_prod.py

# Esperado:
# ✅ Tabelas verificadas/criadas
# ✅ Máquina criada (ID=1)
#   ✅ Pneu dianteiro_esquerdo criado (ID=1)
#   ✅ Pneu dianteiro_direito criado (ID=2)
#   ✅ Pneu traseiro_esquerdo criado (ID=3)
#   ✅ Pneu traseiro_direito criado (ID=4)
#   ✅ 24 leituras criadas para dianteiro_esquerdo
#   ✅ 24 leituras criadas para dianteiro_direito
#   ✅ 24 leituras criadas para traseiro_esquerdo
#   ✅ 24 leituras criadas para traseiro_direito
# ✅✅✅ SEED CONCLUÍDO COM SUCESSO ✅✅✅
```

### Validar
```bash
curl https://tirepredict-production.up.railway.app/maquinas
# Retornar: [{"id": 1, "nome": "Trator John Deere", "modelo": "6110J"}]
```

---

## STEP 2️⃣: Adicionar JWT_SECRET_KEY (Railway) (2 min)

Via dashboard:
1. Projeto TirePredict → Serviço `tirepredict` → Variables
2. "+ Add Variable"
3. Nome: `JWT_SECRET_KEY`
4. Valor: Click "Generate" → gera 32 caracteres aleatórios ✅
5. Click "Save"

**OU via CLI**:
```bash
# (Se tiver acesso a Railway CLI com deploy permissions)
# railway env set JWT_SECRET_KEY $(openssl rand -base64 32)
```

---

## STEP 3️⃣: Deploy Backend com JWT (10 min)

```bash
# 1. Commits
git add backend/seed_prod.py backend/auth.py requirements.txt
git commit -m "feat(phase-1): add seed script and JWT authentication"
git push origin main

# 2. Railway detecta e faz deploy automático
# Monitorar em: railway.com/project/[seu-projeto]/deployments

# 3. Validar
curl -X POST https://tirepredict-production.up.railway.app/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@tirepredict.com", "password": "demo123"}'

# Retornar:
# {"access_token": "eyJ0eXAiOiJKV1QiLC...", "token_type": "bearer", "expires_in": 86400}
```

---

## STEP 4️⃣: Frontend - Preparar Vite (10 min)

```bash
cd frontend

# 1. Instalar dependências novas (se não tiver)
npm install react-router-dom@7.18.2 axios@1.7.0

# 2. Teste local
npm run build
npm run preview

# Abrir http://localhost:4173
# Deve ter tela de login (ainda não tem componentes)
```

---

## STEP 5️⃣: Adicionar Components de Login (20 min)

**Criar** `frontend/src/pages/Login.jsx`:
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

**Criar** `frontend/src/styles/Login.css`:
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

---

## STEP 6️⃣: Atualizar App.jsx com Roteamento (10 min)

**Editar** `frontend/src/App.jsx`:
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

---

## STEP 7️⃣: Atualizar api.js com Interceptors (10 min)

**Editar** `frontend/src/api/api.js`:
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

---

## STEP 8️⃣: Deploy Frontend em Railway (15 min)

### Opção A: Via CLI (Mais rápido)
```bash
# Dentro de /root/repo/frontend
railway service create frontend --source-repo leiteminh0/tirepredict

# Configurar:
# - Root Directory: frontend
# - Build Command: npm run build
# - Start Command: npm run preview
# - Service Domain: tirepredict-frontend.up.railway.app
# - Port: 4173
```

### Opção B: Via Dashboard
1. TirePredict → "+ New Service"
2. "GitHub Repo" → `leiteminh0/tirepredict`
3. Build Settings:
   ```
   Root: frontend
   Build: npm run build
   Start: npm run preview
   ```
4. Networking:
   ```
   Service Domain: tirepredict-frontend.up.railway.app
   Port: 4173
   ```
5. Deploy

---

## STEP 9️⃣: Teste Local E-2-E (10 min)

```bash
# Terminal 1: Backend
cd backend
export DATABASE_URL="sqlite:///./phase1_test.db"
python seed_prod.py
export JWT_SECRET_KEY="test-secret-key"
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: Browser
# Abrir http://localhost:5173
# 1. Deve mostrar tela de login
# 2. Email: demo@tirepredict.com
# 3. Senha: demo123
# 4. Click "Entrar"
# 5. Deve redirecionar pra /dashboard
# 6. Dashboard deve mostrar:
#    ✅ "Trator John Deere" na seção Máquinas
#    ✅ 4 pneus com posições
#    ✅ Últimas leituras em cada pneu
#    ✅ Gráfico com histórico de pressão/temperatura
#    ✅ Alertas (2 críticos)
```

---

## 🎯 Checklist Final

- [ ] Seed executado em produção: `railway run python backend/seed_prod.py`
- [ ] `/maquinas` retorna dados: `curl https://tirepredict-production.up.railway.app/maquinas`
- [ ] `/login` retorna token: `curl -X POST https://tirepredict-production.up.railway.app/login -d '{"email":"demo@tirepredict.com","password":"demo123"}'`
- [ ] Frontend deployado em Railway
- [ ] Tela de login carregando
- [ ] Login com credenciais demo funciona
- [ ] Dashboard mostra máquina + pneus + dados
- [ ] Gráfico renderiza sem erros
- [ ] Console sem erros vermelhos
- [ ] Todos 3 componentes (Frontend + Backend + ML) funcionam juntos

---

## 🚨 Troubleshooting

### "Connection lost" no dashboard
**Solução**: Recarregar página (F5). Se persistir, verificar:
```bash
curl -i https://tirepredict-production.up.railway.app/health
```
Deve retornar 200.

### Token inválido / 401
**Solução**: Verificar que `JWT_SECRET_KEY` está setada em Railway → Variables

### Gráfico vazio
**Solução**: Pode ser que seed não tenha sido executado. Reexecute:
```bash
railway run python backend/seed_prod.py
```

### Frontend não carrega
**Solução**: Verificar build logs em Railway dashboard

---

## ⏱️ Timeline Real

| Passo | Tempo | Status |
|-------|-------|--------|
| 1. Seed | 5 min | ✅ RÁPIDO |
| 2. JWT setup | 2 min | ✅ RÁPIDO |
| 3. Deploy backend | 5 min | ✅ AUTO |
| 4. Frontend prep | 10 min | ✅ LOCAL |
| 5-7. Components | 40 min | ✅ COPIAR/COLAR |
| 8. Deploy frontend | 15 min | ✅ AUTO |
| 9. E-2-E test | 10 min | ✅ VALIDAR |
| **TOTAL** | **~90 min** | **🚀 LIVE** |

---

**Status**: ✅ PRONTO PARA COPIAR & COLAR  
**Próxima etapa após sucesso**: Fase 2 (Estabilização informada por uso real)

