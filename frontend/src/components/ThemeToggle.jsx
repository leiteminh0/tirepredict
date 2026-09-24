import { useEffect, useState } from 'react';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('tirepredict-theme') || 'dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('tirepredict-theme', theme); }, [theme]);
  const next = theme === 'dark' ? 'light' : 'dark';
  return <button type="button" className="theme-toggle" onClick={() => setTheme(next)} aria-label={`Ativar tema ${next === 'dark' ? 'escuro' : 'claro'}`} title={`Tema ${next === 'dark' ? 'escuro' : 'claro'}`}><span aria-hidden="true">{theme === 'dark' ? '☾' : '☼'}</span><span className="theme-toggle__label">{theme === 'dark' ? 'Noite' : 'Dia'}</span></button>;
}
