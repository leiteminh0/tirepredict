import { useEffect, useState } from "react";

// Idade da telemetria contada a partir do valor que o backend já calculou
// (segundos_desde_ultima_leitura). Partindo do servidor, o painel não depende
// do relógio da máquina do operador nem sofre com fuso.
export function useIdadeTelemetria(segundosIniciais, validadeSegundos) {
  const [segundos, setSegundos] = useState(segundosIniciais ?? null);

  useEffect(() => {
    setSegundos(segundosIniciais ?? null);
    if (segundosIniciais == null) return undefined;
    const id = setInterval(() => {
      setSegundos((atual) => (atual == null ? atual : atual + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [segundosIniciais]);

  const vencido = segundos != null && segundos > validadeSegundos;

  return { segundos, vencido };
}
