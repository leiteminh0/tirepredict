import { createContext, useContext, useState } from "react";

const CHAVE_TOKEN = "tp:write-api-token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(CHAVE_TOKEN) ?? ""; } catch { return ""; }
  });

  const login = (valor) => {
    try { sessionStorage.setItem(CHAVE_TOKEN, valor); } catch { /* modo privado */ }
    setToken(valor);
  };

  const logout = () => {
    try { sessionStorage.removeItem(CHAVE_TOKEN); } catch { /* */ }
    setToken("");
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, autenticado: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
