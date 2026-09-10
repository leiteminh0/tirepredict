"""
Autenticação JWT simples e segura para TirePredict.

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

