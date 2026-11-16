import { describe, expect, it } from "vitest";
import { formatActivity, importNotice, NOTICE_ACTION, NOTICE_OK } from "./import-notice";

describe("importNotice", () => {
  it("ok: una línea neutra, sin bloque ni razones", () => {
    expect(importNotice({ level: "ok", reasons: [] })).toEqual({ kind: "neutral", title: NOTICE_OK, action: null, reasons: [] });
  });

  it("aviso: bloque con la frase accionable y las razones", () => {
    const n = importNotice({ level: "aviso", reasons: ["a", "b"] });
    expect(n.kind).toBe("aviso");
    expect(n.action).toBe(NOTICE_ACTION);
    expect(n.reasons).toEqual(["a", "b"]);
  });

  it("alto: mismo bloque con un título más claro y sin tono de alarma", () => {
    const n = importNotice({ level: "alto", reasons: ["x"] });
    expect(n.kind).toBe("aviso");
    expect(n.title).toBe("Revisa este respaldo antes de reemplazar");
    expect(n.title).not.toMatch(/[¡!]|cuidado/i);
  });
});

describe("formatActivity", () => {
  it("null es «sin actividad»", () => expect(formatActivity(null)).toBe("sin actividad"));
  it("una fecha sale en es-MX", () => expect(formatActivity(Date.UTC(2026, 0, 5, 18, 0))).toMatch(/2026/));
});
