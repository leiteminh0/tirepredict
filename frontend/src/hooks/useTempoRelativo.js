import { useEffect, useState } from 'react';

const LIMITE_VENCIDO_MS = 30_000;

function calcular(timestamp) {
  if (!timestamp) return { texto: 'sem leitura', vencido: true };
  const diff = Date.now() - new Date(timestamp).getTime();
  const seg = Math.max(0, Math.floor(diff / 1000));
  let texto;
  if (seg < 60) texto = `há ${seg}s`;
  else if (seg < 3600) texto = `há ${Math.floor(seg / 60)} min`;
  else texto = `há ${Math.floor(seg / 3600)} h`;
  return { texto, vencido: diff > LIMITE_VENCIDO_MS };
}

export function useTempoRelativo(timestamp) {
  const [estado, setEstado] = useState(() => calcular(timestamp));

  useEffect(() => {
    setEstado(calcular(timestamp));
    const id = setInterval(() => setEstado(calcular(timestamp)), 1000);
    return () => clearInterval(id);
  }, [timestamp]);

  return estado;
}
