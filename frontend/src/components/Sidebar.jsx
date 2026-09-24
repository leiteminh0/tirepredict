import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

/* Inline SVG icons — no icon library dependency */
const Icon = ({ name, size = 18 }) => {
  const icons = {
    fleet: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="3" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="11" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 10 L6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 10 L13.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="10" cy="10" r="1.25" fill="currentColor"/>
      </svg>
    ),
    alerts: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.5 L17.5 15.5 H2.5 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M10 8.5 V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="10" cy="13.5" r="0.75" fill="currentColor"/>
      </svg>
    ),
    chevronLeft: (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    chevronRight: (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tiretrack: (
      <svg width={28} height={28} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
        <circle cx="14" cy="14" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="14" cy="14" r="2.5" fill="currentColor"/>
        <line x1="14" y1="3" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="14" y1="21" x2="14" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="3" y1="14" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="21" y1="14" x2="25" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  };
  return icons[name] ?? null;
};

export default function Sidebar({ onCollapseChange }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const emMaquina = /\/maquinas\//.test(location.pathname);
  const maquinaBase = emMaquina
    ? location.pathname.replace(/\/dashboard$|\/alertas$/, "")
    : null;

  const isActive = (pattern) => pattern.test(location.pathname);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapseChange?.(next);
  };

  const navItems = [
    {
      to: "/frota",
      icon: "fleet",
      label: "Frota",
      active: isActive(/^\/frota$/) || location.pathname === "/",
      always: true,
    },
    {
      to: maquinaBase ? `${maquinaBase}/dashboard` : "/frota",
      icon: "dashboard",
      label: "Painel da máquina",
      active: isActive(/\/dashboard$/),
      disabled: !emMaquina,
    },
    {
      to: maquinaBase ? `${maquinaBase}/alertas` : "/frota",
      icon: "alerts",
      label: "Alertas da máquina",
      active: isActive(/\/alertas$/),
      disabled: !emMaquina,
    },
  ];

  return (
    <aside className={`tp-sidebar${collapsed ? " tp-sidebar--collapsed" : ""}`} aria-label="Navegação principal">
      {/* Logo */}
      <div className="tp-sidebar__logo">
        <span className="tp-sidebar__logo-icon">
          <Icon name="tiretrack" size={collapsed ? 24 : 28} />
        </span>
        {!collapsed && (
          <div className="tp-sidebar__logo-text">
            <span className="tp-sidebar__logo-brand">TirePredict</span>
            <span className="tp-sidebar__logo-sub">Fleet Intelligence</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="tp-sidebar__nav">
        {navItems.map((item) => (
          <Link
            key={item.to + item.label}
            to={item.to}
            className={[
              "tp-sidebar__link",
              item.active ? "tp-sidebar__link--active" : "",
              item.disabled ? "tp-sidebar__link--disabled" : "",
            ].join(" ").trim()}
            aria-current={item.active ? "page" : undefined}
            aria-disabled={item.disabled || undefined}
            tabIndex={item.disabled ? -1 : 0}
            title={collapsed ? item.label : undefined}
          >
            <span className="tp-sidebar__link-icon">
              <Icon name={item.icon} />
            </span>
            {!collapsed && (
              <span className="tp-sidebar__link-label">{item.label}</span>
            )}
            {item.active && <span className="tp-sidebar__link-indicator" aria-hidden="true" />}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="tp-sidebar__footer">
        {!collapsed && (
          <div className="tp-sidebar__status">
            <span className="tp-sidebar__status-dot" aria-hidden="true" />
            <span className="tp-sidebar__status-label">Sistema ativo</span>
          </div>
        )}
        <button
          type="button"
          className="tp-sidebar__collapse-btn"
          onClick={toggle}
          aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
        </button>
      </div>
    </aside>
  );
}
