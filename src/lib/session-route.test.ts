import { describe, expect, it } from "vitest";
import { countForRing, type RouteInput, sessionRoute } from "./session-route";

const base: RouteInput = { dueCards: 4, reviewBlockDone: false, missionDone: false, gymDone: false, sessionDone: false };
const states = (i: Partial<RouteInput>) => sessionRoute({ ...base, ...i }).map((s) => s.state);

describe("ruta de la sesión", () => {
  it("al empezar con repasos vencidos, el calentamiento es el paso actual", () => {
    expect(states({})).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(countForRing(sessionRoute(base))).toEqual({ done: 0, total: 4 });
  });

  it("avanza en orden y siempre hay un solo paso actual hasta terminar", () => {
    expect(states({ reviewBlockDone: true })).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(states({ reviewBlockDone: true, missionDone: true })).toEqual(["done", "done", "current", "upcoming"]);
    expect(states({ reviewBlockDone: true, missionDone: true, gymDone: true })).toEqual(["done", "done", "done", "current"]);
    const all = sessionRoute({ ...base, reviewBlockDone: true, missionDone: true, gymDone: true, sessionDone: true });
    expect(all.every((s) => s.state === "done")).toBe(true);
    expect(countForRing(all)).toEqual({ done: 4, total: 4 });
  });

  it("si un paso posterior ya se hizo (p. ej. el gimnasio por su cuenta), el actual es el primero que falta", () => {
    expect(states({ reviewBlockDone: true, gymDone: true })).toEqual(["done", "current", "done", "upcoming"]);
  });

  it("sin repasos vencidos el calentamiento no es el paso actual (la sesión lo salta)", () => {
    const s = sessionRoute({ ...base, dueCards: 0 });
    expect(s[0]?.state).not.toBe("current");
    expect(s[1]?.state).toBe("current");
    // El anillo nunca cuenta más pasos de los que existen ni hechos de más.
    const ring = countForRing(s);
    expect(ring.done).toBeLessThanOrEqual(ring.total);
  });
});
