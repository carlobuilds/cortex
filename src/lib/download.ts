/** Descarga un texto como archivo desde el navegador (sin red: blob local). */
export function downloadText(filename: string, text: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Archivo listo para compartir; se prepara antes del toque (ver `shareFile`). */
export function makeFile(filename: string, text: string, type = "application/json"): File {
  return new File([text], filename, { type });
}

/** ¿Este navegador puede compartir un archivo (hoja de compartir: AirDrop, Archivos)? Solo en cliente. */
export function canShareFiles(type = "application/json"): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function" || typeof navigator.share !== "function") return false;
  try {
    return navigator.canShare({ files: [makeFile("prueba.json", "{}", type)] });
  } catch {
    return false;
  }
}

export type ShareResult = "shared" | "cancelled" | "retry";

/**
 * Abre la hoja de compartir. NO es `async` y no espera nada antes de `navigator.share`: Safari exige
 * activación transitoria del toque, y un `await` previo (Dexie, por ejemplo) la pierde.
 * - `cancelled` (`AbortError`): la persona cerró la hoja; no se muestra nada.
 * - `retry` (`NotAllowedError`): se perdió la activación; hay que preparar y tocar otra vez. No es un error.
 * Cualquier otro fallo se propaga.
 */
export function shareFile(file: File, title: string): Promise<ShareResult> {
  let sharing: Promise<void>;
  try {
    sharing = navigator.share({ files: [file], title });
  } catch (e) {
    return Promise.reject(e); // un `throw` síncrono llega al `.catch` de quien llama, no se escapa
  }
  return sharing.then(
    () => "shared" as const,
    (e: unknown) => {
      const name = e instanceof Error || e instanceof DOMException ? e.name : "";
      if (name === "AbortError") return "cancelled" as const;
      if (name === "NotAllowedError") return "retry" as const;
      throw e;
    },
  );
}
