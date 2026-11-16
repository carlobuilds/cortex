"use client";

import { useEffect } from "react";
import { isPwaBuild, isStandalone } from "./pwa-state";

const UPDATE_EVERY_MS = 60 * 60 * 1000;

/**
 * Registra el service worker solo en la build del iPad (`NEXT_PUBLIC_CORTEX_PWA=1`): nunca en
 * `pnpm dev` ni en la build de la Mac. Se registra tras el evento `load` para que la precarga
 * (decenas de MB) no compita con la primera pantalla. No renderiza nada.
 *
 * Si la app corre instalada y el almacenamiento aún no es persistente, lo pide una vez por carga:
 * Safari no muestra aviso y decide solo; el estado se ve en Ajustes (storage-status.tsx).
 */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!isPwaBuild(process.env.NEXT_PUBLIC_CORTEX_PWA)) {
      // En la Mac nunca hay un service worker legítimo: darlos de baja evita un worker zombi si
      // alguien sirvió `out/` en localhost.
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => ("caches" in window ? caches.keys() : []))
        .then((names) => Promise.all(names.filter((n) => n.startsWith("cortex-")).map((n) => caches.delete(n))))
        .catch(() => undefined);
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          registration = reg;
        })
        .catch(() => {
          // Sin service worker la app sigue funcionando con conexión; Ajustes mostrará que falta la copia.
        });
    };
    // Al volver a primer plano (a lo más una vez por hora) se busca un sw.js nuevo: así un arreglo o el
    // kill switch llegan aunque iOS mantenga la app suspendida días.
    let lastUpdate = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !registration || Date.now() - lastUpdate < UPDATE_EVERY_MS) return;
      lastUpdate = Date.now();
      registration.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    const standalone = isStandalone({
      matchesStandalone: window.matchMedia("(display-mode: standalone)").matches,
      navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
    });
    if (standalone && navigator.storage?.persist && navigator.storage.persisted) {
      void navigator.storage
        .persisted()
        .then((persisted) => (persisted ? undefined : navigator.storage.persist()))
        .catch(() => undefined);
    }
    return () => {
      window.removeEventListener("load", register);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
