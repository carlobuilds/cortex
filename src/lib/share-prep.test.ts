import { describe, expect, it } from "vitest";
import { type BuildResult, MAX_SHARE_RETRIES, SharePreparer } from "./share-prep";

const file = (n: string) => new File(["{}"], n);
const ok = (n: string): BuildResult => ({ ok: true, file: file(n), tooBig: null, at: 1 });

function deferred() {
  let resolve!: (r: BuildResult) => void;
  const promise = new Promise<BuildResult>((r) => (resolve = r));
  return { promise, resolve };
}

describe("SharePreparer: tres estados", () => {
  it("idle → preparing → ready", async () => {
    const d = deferred();
    const p = new SharePreparer(() => d.promise);
    expect(p.getSnapshot().state.status).toBe("idle");
    const run = p.prepare();
    expect(p.getSnapshot().state.status).toBe("preparing");
    d.resolve(ok("a"));
    await run;
    expect(p.getSnapshot().state.status).toBe("ready");
  });

  it("falla: queda en failed con el mensaje, tanto si devuelve error como si lanza", async () => {
    const p = new SharePreparer(() => Promise.resolve({ ok: false, error: "boom" }));
    await p.prepare();
    expect(p.getSnapshot().state).toEqual({ status: "failed", error: "boom" });
    const q = new SharePreparer(() => Promise.reject(new Error("raro")));
    await q.prepare();
    expect(q.getSnapshot().state).toEqual({ status: "failed", error: "raro" });
  });
});

describe("SharePreparer: generación e invalidación", () => {
  it("una preparación vieja que termina tarde no pisa a la nueva", async () => {
    const a = deferred();
    const b = deferred();
    const queue = [a, b];
    const p = new SharePreparer(() => (queue.shift() as ReturnType<typeof deferred>).promise);
    const first = p.prepare();
    const second = p.prepare();
    b.resolve(ok("nuevo"));
    await second;
    a.resolve(ok("viejo"));
    await first;
    const s = p.getSnapshot().state;
    expect(s.status === "ready" && s.file.name).toBe("nuevo");
  });

  it("invalidate descarta el archivo y una preparación en vuelo", async () => {
    const d = deferred();
    const p = new SharePreparer(() => d.promise);
    const run = p.prepare();
    p.invalidate();
    d.resolve(ok("a"));
    await run;
    expect(p.getSnapshot().state.status).toBe("idle");
  });

  it("take consume el archivo una sola vez", async () => {
    const p = new SharePreparer(() => Promise.resolve(ok("a")));
    expect(p.take()).toBeNull();
    await p.prepare();
    expect(p.take()?.file.name).toBe("a");
    expect(p.take()).toBeNull();
    expect(p.getSnapshot().state.status).toBe("idle");
  });
});

describe("SharePreparer: tope de NotAllowedError", () => {
  it("al segundo retry seguido deja de ofrecer compartir; un éxito reinicia la cuenta", () => {
    const p = new SharePreparer(() => Promise.resolve(ok("a")));
    expect(MAX_SHARE_RETRIES).toBe(2);
    expect(p.noteRetry()).toBe(false);
    p.resetRetries();
    expect(p.noteRetry()).toBe(false);
    expect(p.noteRetry()).toBe(true);
    expect(p.getSnapshot().disabled).toBe(true);
  });

  it("avisa a los suscritos", () => {
    const p = new SharePreparer(() => Promise.resolve(ok("a")));
    let n = 0;
    const off = p.subscribe(() => n++);
    p.invalidate();
    off();
    p.invalidate();
    expect(n).toBe(1);
  });
});
