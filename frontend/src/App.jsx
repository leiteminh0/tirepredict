import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Alertas from "./pages/Alertas";
import Frota from "./pages/Frota";

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
            <Route path="/alertas" element={<Navigate to="/frota" replace />} />
            <Route path="/dashboard" element={<Navigate to="/frota" replace />} />
            <Route path="/maquinas/:maquinaId/dashboard" element={<Dashboard />} />
            <Route path="/maquinas/:maquinaId/alertas" element={<Alertas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
export default App;
