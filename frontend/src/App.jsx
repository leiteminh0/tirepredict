import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Alertas from "./pages/Alertas";
import Frota from "./pages/Frota";
import Simulador from "./pages/Simulador";
import Relatorio from "./pages/Relatorio";
import HistoricoAlertas from "./pages/HistoricoAlertas";
import Login from "./pages/Login";

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

function RotaProtegida({ children }) {
  const { autenticado } = useAuth();
  return autenticado ? children : <Navigate to="/login" replace />;
}

function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { autenticado } = useAuth();
  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      {autenticado && <Sidebar onCollapseChange={setSidebarCollapsed} />}
      <main className={autenticado ? "app-main" : ""}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RotaProtegida><Navigate to="/frota" replace /></RotaProtegida>} />
          <Route path="/frota" element={<RotaProtegida><Frota /></RotaProtegida>} />
          <Route path="/simulador" element={<RotaProtegida><Simulador /></RotaProtegida>} />
          <Route path="/relatorio" element={<RotaProtegida><Relatorio /></RotaProtegida>} />
          <Route path="/historico-alertas" element={<RotaProtegida><HistoricoAlertas /></RotaProtegida>} />
          <Route path="/alertas" element={<RotaProtegida><Navigate to="/frota" replace /></RotaProtegida>} />
          <Route path="/dashboard" element={<RotaProtegida><Navigate to="/frota" replace /></RotaProtegida>} />
          <Route path="/maquinas/:maquinaId/dashboard" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
          <Route path="/maquinas/:maquinaId/alertas" element={<RotaProtegida><Alertas /></RotaProtegida>} />
          <Route path="*" element={<PaginaNaoEncontrada />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
