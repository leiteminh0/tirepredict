import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { verificarToken } from "../services/api";
import { mensagemDeErroLogin } from "../utils/login";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valor = senha.trim();
    if (!valor) return;
    setCarregando(true);
    setErro(null);
    try {
      // O token só entra na sessão depois que a API confirma que ele vale:
      // antes disto o login validava /health, que é público e aceita qualquer valor.
      await verificarToken(valor);
      login(valor);
      navigate("/frota", { replace: true });
    } catch (erro) {
      setErro(mensagemDeErroLogin(erro));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="tp-login-page">
      <div className="tp-login-card glass-2">
        <div className="tp-login-logo">
          <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
            <circle cx="14" cy="14" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="14" cy="14" r="2.5" fill="currentColor"/>
            <line x1="14" y1="3" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="14" y1="21" x2="14" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3" y1="14" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="21" y1="14" x2="25" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="tp-login-brand">TirePredict</span>
        </div>

        <h1 className="tp-login-title">Acesso ao sistema</h1>
        <p className="tp-login-sub">Informe o token de operação para continuar.</p>

        <form className="tp-login-form" onSubmit={handleSubmit} noValidate>
          <label className="tp-login-label" htmlFor="tp-login-token">
            Token de acesso
          </label>
          <input
            id="tp-login-token"
            className={`tp-login-input${erro ? " tp-login-input--erro" : ""}`}
            type="password"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(null); }}
            placeholder="WRITE_API_TOKEN"
            autoComplete="current-password"
            autoFocus
            disabled={carregando}
          />
          {erro && <p className="tp-login-erro" role="alert">{erro}</p>}
          <button
            type="submit"
            className="tp-login-btn"
            disabled={!senha.trim() || carregando}
          >
            {carregando ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
