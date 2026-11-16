"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/state";
import type { StudyCatalog } from "@/content/core/study-catalog";
import { buildCommands, type Command, matchRange, searchCommands } from "@/lib/command-search";
import { loadCatalog } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";
import { MORE_NAV, PRIMARY_NAV } from "./nav-items";
import { useThemePreference } from "./theme-sync";

const PAGES = [...PRIMARY_NAV, ...MORE_NAV].map(({ href, label }) => ({ href, label }));
const optionId = (i: number) => `paleta-opcion-${i}`;
const noSubscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform);

function Highlighted({ text, query }: { text: string; query: string }) {
  const range = matchRange(text, query);
  if (!range) return <>{text}</>;
  const [a, b] = range;
  return (
    <>
      {text.slice(0, a)}
      <mark className="bg-transparent font-semibold text-brand">{text.slice(a, b)}</mark>
      {text.slice(b)}
    </>
  );
}

/**
 * Paleta de comandos (Ctrl/⌘ + K): unidades, jefes, conceptos, páginas y tema. Sin dependencias
 * (ADR-020): Dialog de Radix + combobox ARIA; el foco se queda en el campo y la opción activa se
 * anuncia con aria-activedescendant.
 */
export function CommandPalette() {
  const router = useRouter();
  const { setPreference } = useThemePreference();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [catalog, setCatalog] = useState<StudyCatalog | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  // En el servidor dice "Ctrl K"; en Mac, "⌘K" (useSyncExternalStore evita el error de hidratación).
  const shortcut = useSyncExternalStore(noSubscribe, () => (isApple() ? "⌘K" : "Ctrl K"), () => "Ctrl K");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // El catálogo se pide solo al abrir (loadCatalog lo cachea por pestaña).
  useEffect(() => {
    if (!open || catalog) return;
    let alive = true;
    loadCatalog().then(
      (c) => alive && setCatalog(c),
      () => alive && setCatalogFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [open, catalog]);

  const commands = useMemo(() => buildCommands(catalog, PAGES), [catalog]);
  const groups = useMemo(() => searchCommands(commands, query), [commands, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  // Índice global de cada opción (para aria-activedescendant y las flechas).
  const indexed = useMemo(() => {
    let next = 0;
    return groups.map((g) => ({ group: g.group, items: g.items.map((cmd) => ({ cmd, i: next++ })) }));
  }, [groups]);
  const current = Math.min(active, Math.max(flat.length - 1, 0));

  useEffect(() => {
    if (open) document.getElementById(optionId(current))?.scrollIntoView({ block: "nearest" });
  }, [current, open]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActive(0);
    }
  };

  const run = (cmd: Command) => {
    onOpenChange(false);
    if ("href" in cmd) router.push(cmd.href);
    else setPreference(cmd.theme);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flat.length === 0) return;
    const moves: Record<string, number> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: flat.length - 1 };
    const to = moves[e.key];
    if (to !== undefined) {
      e.preventDefault();
      setActive((to + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = flat[current];
      if (cmd) run(cmd);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className="tactile flex h-8 touch:h-11 touch:min-w-11 touch:justify-center shrink-0 items-center gap-2 rounded-md border bg-surface-2 px-2 text-sm text-ink-2 hover:border-border-strong hover:text-ink xl:px-2.5">
        <Search aria-hidden className="size-4" />
        <span className="hidden xl:inline">Buscar</span>
        <span className="sr-only xl:hidden">Buscar</span>
        <Kbd className="hidden xl:inline-grid">{shortcut}</Kbd>
      </DialogTrigger>
      <DialogContent showClose={false} aria-describedby={undefined} className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Buscar en Cortex</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4">
          <Search aria-hidden className="size-4 shrink-0 text-ink-2" />
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-resultados"
            aria-autocomplete="list"
            aria-activedescendant={flat.length ? optionId(current) : undefined}
            aria-label="Buscar unidades, jefes, conceptos o páginas"
            placeholder="Busca una unidad, un jefe, un concepto…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div id="paleta-resultados" role="listbox" aria-label="Resultados" className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
          {indexed.map((g) => (
            <div key={g.group} role="group" aria-labelledby={`paleta-grupo-${g.group}`} className="pb-1">
              <div id={`paleta-grupo-${g.group}`} role="presentation" className="px-2 pt-2 pb-1 text-caption font-medium text-muted-foreground">
                {g.group}
              </div>
              {g.items.map(({ cmd, i }) => {
                return (
                  <div
                    key={cmd.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === current}
                    onMouseMove={() => setActive(i)}
                    onClick={() => run(cmd)}
                    className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 touch:min-h-11 text-sm", i === current && "bg-brand-soft text-ink")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">
                        <Highlighted text={cmd.label} query={query} />
                      </span>
                      {cmd.hint ? <span className="block truncate text-caption text-muted-foreground">{cmd.hint}</span> : null}
                    </span>
                    {i === current ? <Kbd>⏎</Kbd> : null}
                  </div>
                );
              })}
            </div>
          ))}
          {flat.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nada coincide con «{query}».</p> : null}
          {catalogFailed ? <p className="px-3 pb-2 text-caption text-warning">No pude cargar las unidades; las páginas sí están.</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-caption text-muted-foreground touch:hidden">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> moverte
          </span>
          <span>
            <Kbd>⏎</Kbd> abrir
          </span>
          <span>
            <Kbd>Esc</Kbd> cerrar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
