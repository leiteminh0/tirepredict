import { useState, useEffect } from "react";
import "./ThemeToggle.css";

export default function ThemeToggle() {
  const [tema, setTema] = useState("dark");

  useEffect(() => {
    const salvo = localStorage.getItem("tirepredict-tema");
    const inicial = salvo || "dark";
    setTema(inicial);
    document.documentElement.setAttribute("data-theme", inicial);
  }, []);

  function alternar() {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    document.documentElement.setAttribute("data-theme", novo);
    localStorage.setItem("tirepredict-tema", novo);
  }

  return (
    <button className="theme-toggle" onClick={alternar} aria-label="Alternar tema claro e escuro">
      <span aria-hidden="true">{tema === "dark" ? "☀" : "☾"}</span>
      {tema === "dark" ? "Modo claro" : "Modo escuro"}
    </button>
  );
}