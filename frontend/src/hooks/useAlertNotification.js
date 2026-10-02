/**
 * useAlertNotification
 *
 * Dispara notificação nativa do browser (Web Notifications API) quando um pneu
 * muda para nível ALTO. Pede permissão uma vez ao montar.
 *
 * Uso:
 *   const notificar = useAlertNotification();
 *   // chamar notificar(pneus) a cada atualização de dados
 */
import { useCallback, useEffect, useRef } from "react";

export function useAlertNotification() {
  const nivelAnterior = useRef({});

  // Solicita permissão ao montar o componente que usar o hook.
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const notificar = useCallback((pneus = []) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    pneus.forEach((pneu) => {
      const nivelAtual = pneu.nivel;
      const nivelPrev = nivelAnterior.current[pneu.id];

      // Dispara apenas na transição → ALTO (evita notificação repetida).
      if (nivelAtual === "ALTO" && nivelPrev !== "ALTO") {
        new Notification("⚠️ TirePredict — Risco Crítico", {
          body: `Pneu ${pneu.posicao}: pressão ${pneu.pressao ?? "?"} PSI — Verifique imediatamente.`,
          icon: "/favicon.svg",
          tag: `pneu-${pneu.id}`,   // evita duplicar notificações do mesmo pneu
          requireInteraction: true,  // persiste até o usuário fechar
        });
      }

      nivelAnterior.current[pneu.id] = nivelAtual;
    });
  }, []);

  return notificar;
}
