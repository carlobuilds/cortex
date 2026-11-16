import { describe, expect, it } from "vitest";
import { z } from "./common";

describe("configuración de Zod", () => {
  it("jitless se combina con el locale: los mensajes siguen en español", () => {
    expect(z.config().jitless).toBe(true);
    const r = z.string().safeParse(5);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/Entrada inválida/);
  });
});
