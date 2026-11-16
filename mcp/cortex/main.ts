import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathsFor } from "./data";
import { createCortexServer } from "./server";

/**
 * Punto de entrada stdio del MCP de Cortex (`pnpm --silent mcp:cortex`, registrado en `.mcp.json`).
 * La raíz sale de la ubicación de este archivo, no de la carpeta actual. Nunca escribas a stdout:
 * es el canal del protocolo; los avisos van a stderr.
 */

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const server = createCortexServer({ paths: pathsFor(repoRoot) });

await server.connect(new StdioServerTransport());
console.error(`MCP de Cortex listo (raíz: ${repoRoot}).`);
