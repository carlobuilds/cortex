/*
 * Service worker de emergencia (kill switch, E5). Se publica COMO `/sw.js` en lugar del normal:
 * Safari lo detecta en la siguiente revisión, lo instala, borra las cachés `cortex-*`, se da de baja
 * y recarga las ventanas abiertas para que vuelvan a cargar desde la red.
 * No toca IndexedDB (tus datos) ni el almacenamiento local. NUNCA hay que "eliminar la app" del iPad.
 * Aquí skipWaiting/clients.claim sí son correctos: es una operación de rescate, no una actualización.
 */
"use strict";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("cortex-")) await caches.delete(name);
      }
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: "window" });
      for (const client of windows) {
        if (typeof client.navigate === "function") client.navigate(client.url).catch(() => {});
      }
    })(),
  );
});
