import { afterEach, describe, expect, it, vi } from "vitest";
import { canShareFiles, shareFile } from "./download";

const file = new File(["{}"], "r.json", { type: "application/json" });

function stubShare(impl: () => Promise<void>) {
  const share = vi.fn(impl);
  vi.stubGlobal("navigator", { share });
  return share;
}
const fail = (name: string) => () => Promise.reject(new DOMException("x", name));

afterEach(() => vi.unstubAllGlobals());

describe("shareFile", () => {
  it("llama a navigator.share de forma síncrona", () => {
    const share = stubShare(() => Promise.resolve());
    void shareFile(file, "t");
    expect(share).toHaveBeenCalledOnce();
  });
  it("compartido", async () => {
    stubShare(() => Promise.resolve());
    expect(await shareFile(file, "t")).toBe("shared");
  });
  it("AbortError: silencio", async () => {
    stubShare(fail("AbortError"));
    expect(await shareFile(file, "t")).toBe("cancelled");
  });
  it("NotAllowedError: toca otra vez", async () => {
    stubShare(fail("NotAllowedError"));
    expect(await shareFile(file, "t")).toBe("retry");
  });
  it("otro fallo se propaga", async () => {
    stubShare(fail("DataError"));
    await expect(shareFile(file, "t")).rejects.toThrow();
  });
  it("un throw síncrono de share sale como promesa rechazada", async () => {
    vi.stubGlobal("navigator", {
      share: () => {
        throw new TypeError("sync");
      },
    });
    await expect(shareFile(file, "t")).rejects.toThrow("sync");
  });
});

describe("canShareFiles", () => {
  it("exige también navigator.share", () => {
    vi.stubGlobal("navigator", { canShare: () => true });
    expect(canShareFiles()).toBe(false);
    vi.stubGlobal("navigator", { canShare: () => true, share: () => Promise.resolve() });
    expect(canShareFiles()).toBe(true);
  });
});
