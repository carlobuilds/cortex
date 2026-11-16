import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("c-client en la build del iPad", () => {
  it("no hace fetch y responde que C no está disponible", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_CORTEX_PWA", "1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { cRunnerStatus, runC } = await import("./c-client");

    const status = await cRunnerStatus();
    expect(status).toEqual({ enabled: false, message: expect.stringContaining("iPad") });

    const run = await runC("int main(void){return 0;}", []);
    expect(run.status).toBe("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
