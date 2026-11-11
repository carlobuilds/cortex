import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

/**
 * Cercas de los agentes (docs/08): se corren igual que las corre Claude Code, con el lanzador
 * del frontmatter de cada agente y la llamada simulada por stdin. Viven en el proyecto `content`
 * porque necesitan Python.
 */

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function launcher(agent: string): string {
  const text = readFileSync(join(REPO, ".claude", "agents", `${agent}.md`), "utf8");
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text)![1]!;
  const fm = parseYaml(front) as { hooks: { PreToolUse: { hooks: { command: string }[] }[] } };
  return fm.hooks.PreToolUse[0]!.hooks[0]!.command;
}

function run(agent: string, payload: unknown, projectDir = REPO): number {
  const r = spawnSync("sh", ["-c", launcher(agent)], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: "utf8",
  });
  return r.status ?? -1;
}

const bash = (command: string) => ({ tool_name: "Bash", tool_input: { command }, cwd: REPO });
const tool = (tool_name: string, tool_input: Record<string, unknown>) => ({ tool_name, tool_input, cwd: REPO });

describe("cerca-ciega (resolutor-a-ciegas)", () => {
  it.each([
    ["cat content/calculo/01-limites/ejercicios.yaml"],
    [`cat ${REPO}/content/calculo/01-limites/jefe.yaml`],
    ["ls"],
    ["find . -name '*.yaml'"],
    ["grep -r respuesta ."],
    ["git show HEAD:content/calculo/01-limites/ejercicios.yaml"],
    ["cd content && cat x"],
    ["cat ../ESTADO.md"],
    [`.venv/bin/python -I -c "print(open('content/calculo/01-limites/ejercicios.yaml').read())"`],
    [`.venv/bin/python -I -c "import os; print(os.listdir('.'))"`],
    ["cat .next/server/app/catalogo.json.body"],
    ["cat e2e/answer.ts"],
  ])("bloquea: %s", (command) => {
    expect(run("resolutor-a-ciegas", bash(command))).toBe(2);
  });

  it.each([
    [`.venv/bin/python -I -c "import sympy as s; x=s.symbols('x'); print(s.limit(s.sin(x)/x, x, 0))"`],
    [`${REPO}/.venv/bin/python -I -c "print(1+1)"`],
    [`d=$(mktemp -d) && cd "$d" && printf 'print(2**10)\\n' > s.py && python3 -I s.py`],
  ])("permite calcular: %s", (command) => {
    expect(run("resolutor-a-ciegas", bash(command))).toBe(0);
  });

  it("encuentra la cerca si la sesión se abrió en la carpeta de arriba", () => {
    expect(run("resolutor-a-ciegas", bash("echo hola"), dirname(REPO))).toBe(0);
  });

  it("falla cerrada si no encuentra la cerca o la llamada no se entiende", () => {
    expect(run("resolutor-a-ciegas", bash("echo hola"), "/no/existe")).toBe(2);
    expect(run("resolutor-a-ciegas", "esto no es json")).toBe(2);
    expect(run("resolutor-a-ciegas", JSON.stringify("una cadena"))).toBe(2);
  });
});

describe("cerca-coach (coach)", () => {
  it.each([
    [tool("Read", { file_path: `${REPO}/diario/semana-2026-11-10.md` })],
    [tool("Write", { file_path: "diario/semana-2026-11-17.md", content: "x" })],
    [tool("Glob", { pattern: "diario/*.md" })],
    [tool("Glob", { pattern: "*.md", path: `${REPO}/diario` })],
  ])("permite diario/: %j", (payload) => {
    expect(run("coach", payload)).toBe(0);
  });

  it.each([
    [tool("Read", { file_path: `${REPO}/respaldos/cortex-2026-11-10.cortex-backup.json` })],
    [tool("Read", { file_path: `${REPO}/ESTADO.md` })],
    [tool("Write", { file_path: `${REPO}/diario/../src/x.ts`, content: "x" })],
    [tool("Glob", { pattern: "**/*.json" })],
    [tool("Grep", { pattern: "calificacion" })],
    [tool("Edit", { file_path: `${REPO}/content/x.yaml`, old_string: "a", new_string: "b" })],
    [tool("Bash", { command: "ls" })],
  ])("bloquea fuera de diario/: %j", (payload) => {
    expect(run("coach", payload)).toBe(2);
  });
});

describe("cerca-infra (dev-infra)", () => {
  it.each([
    ["ssh carlo@vps 'uptime'"],
    ["scp deploy/Caddyfile vps:/etc/caddy/"],
    ["rsync -av deploy/ carlo@1.2.3.4:/srv/"],
    ["ssh-keygen -t ed25519"],
    ["curl -X POST https://developers.hostinger.com/api/vps/v1/virtual-machines"],
  ])("bloquea: %s", (command) => {
    expect(run("dev-infra", bash(command))).toBe(2);
  });

  it.each([["pnpm build"], ["rsync -a out/ /tmp/out-copy/"], ["caddy fmt deploy/Caddyfile"]])("permite: %s", (command) => {
    expect(run("dev-infra", bash(command))).toBe(0);
  });
});
