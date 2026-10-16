import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Alertas from "./pages/Alertas";
import Frota from "./pages/Frota";
import Simulador from "./pages/Simulador";
import Relatorio from "./pages/Relatorio";
import HistoricoAlertas from "./pages/HistoricoAlertas";

function PaginaNaoEncontrada() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "1rem",
        color: "var(--tp-neutral-500)",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <path d="M24 14v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="32" r="1.5" fill="currentColor" />
      </svg>
      <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--tp-neutral-900)" }}>
        Página não encontrada
      </p>
      <p style={{ fontSize: "0.875rem" }}>
        O endereço que você acessou não existe neste sistema.
      </p>
      <Link
        to="/frota"
        style={{
          marginTop: "0.5rem",
          padding: "0.5rem 1.25rem",
          borderRadius: "6px",
          background: "var(--tp-brand)",
          color: "#fff",
          textDecoration: "none",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}
      >
        Voltar para a Frota
      </Link>
    </div>
  );
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <BrowserRouter>
      <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <Sidebar onCollapseChange={setSidebarCollapsed} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/frota" replace />} />
            <Route path="/frota" element={<Frota />} />
            <Route path="/simulador" element={<Simulador />} />
            <Route path="/relatorio" element={<Relatorio />} />
            <Route path="/historico-alertas" element={<HistoricoAlertas />} />
            <Route path="/alertas" element={<Navigate to="/frota" replace />} />
            <Route path="/dashboard" element={<Navigate to="/frota" replace />} />
            <Route path="/maquinas/:maquinaId/dashboard" element={<Dashboard />} />
            <Route path="/maquinas/:maquinaId/alertas" element={<Alertas />} />
            {/* Fallback — qualquer rota não mapeada cai aqui */}
            <Route path="*" element={<PaginaNaoEncontrada />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
export default App;
