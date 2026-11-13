import { createContext, useContext, useEffect, useState } from "react";
import { verificarToken } from "../services/api";
import { sessaoDeveSerEncerrada } from "../utils/login";

const CHAVE_TOKEN = "tp:write-api-token";

const AuthContext = createContext(null);

const lerToken = () => {
  try { return sessionStorage.getItem(CHAVE_TOKEN) ?? ""; } catch { return ""; }
};

const guardarToken = (valor) => {
  try { sessionStorage.setItem(CHAVE_TOKEN, valor); } catch { /* modo privado */ }
};

const apagarToken = () => {
  try { sessionStorage.removeItem(CHAVE_TOKEN); } catch { /* */ }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(lerToken);
  // Só existe sessão a revalidar se havia token guardado ao abrir o app.
  const [verificando, setVerificando] = useState(() => Boolean(lerToken()));

  useEffect(() => {
    const guardado = lerToken();
    if (!guardado) {
      setVerificando(false);
      return undefined;
    }

    let ativo = true;
    verificarToken(guardado)
      .catch((erro) => {
        // Encerra a sessão apenas quando a API diz que o token não vale (401) ou
        // que o servidor não tem token configurado (503). Em falha de rede a
        // sessão é preservada: derrubar o operador por um blip de rede seria pior
        // do que mantê-lo logado com um token possivelmente válido.
        if (sessaoDeveSerEncerrada(erro)) {
          apagarToken();
          if (ativo) setToken("");
        }
      })
      .finally(() => {
        if (ativo) setVerificando(false);
      });

    return () => { ativo = false; };
  }, []);

  const login = (valor) => {
    guardarToken(valor);
    setToken(valor);
  };

  const logout = () => {
    apagarToken();
    setToken("");
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, autenticado: !!token, verificando }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
