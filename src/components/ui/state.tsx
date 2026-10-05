import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Estados uniformes (ADR-020): carga, vacío, cifras y atajos. Sin "use client": sirven en el
 * servidor y en el cliente.
 */

/** Bloque gris que late mientras carga (con movimiento reducido no late). */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("animate-pulse rounded-md bg-surface-2", className)} {...props} />;
}

/**
 * Carga de una sección: forma aproximada de lo que viene + texto para lectores de pantalla.
 * `rows` dibuja filas (listas); sin `rows`, un título y un panel.
 */
export function LoadingState({ label = "Cargando…", rows, className }: { label?: string; rows?: number; className?: string }) {
  return (
    <div aria-busy="true" className={cn("grid gap-3", className)}>
      {rows ? (
        Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
      ) : (
        <>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48 rounded-lg" />
        </>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Lista o sección vacía: dice qué es, por qué está vacía y qué hacer. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-ink-2">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="grid max-w-sm gap-1">
        <p className="font-semibold">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

const TONES = {
  neutral: "text-ink",
  brand: "text-brand",
  success: "text-success",
  xp: "text-xp-text",
  streak: "text-streak",
  life: "text-danger",
} as const;

/** Cifra con etiqueta (Inicio, progreso, cierres). Número en mono tabular; etiqueta en sans. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof TONES;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("raised flex items-start justify-between gap-3 rounded-lg border bg-surface p-4", className)}>
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <p className={cn("mt-1 font-mono text-3xl font-semibold tabular-nums", TONES[tone])}>{value}</p>
        {hint ? <p className="mt-1 text-caption text-muted-foreground">{hint}</p> : null}
      </div>
      {Icon ? (
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-md border bg-surface-2", TONES[tone])}>
          <Icon aria-hidden className="size-4" />
        </span>
      ) : null}
    </div>
  );
}

/** Tecla o atajo. En pantallas táctiles (sin puntero fino) no se muestra: ahí no hay teclado. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd" className={cn("kbd [@media(pointer:coarse)]:hidden", className)} {...props} />;
}

/** Anillo de progreso (0–1) con contenido al centro. `label` es lo que oye el lector de pantalla. */
export function ProgressRing({
  value,
  label,
  tone = "brand",
  className,
  children,
}: {
  value: number;
  label: string;
  tone?: "brand" | "xp";
  className?: string;
  children?: React.ReactNode;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <div role="img" aria-label={label} className={cn("relative grid size-32 shrink-0 place-items-center", className)}>
      <svg aria-hidden viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" className="stroke-surface-3" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className={cn(tone === "xp" ? "stroke-xp" : "stroke-brand", "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500")}
        />
      </svg>
      <div aria-hidden className="text-center">
        {children}
      </div>
    </div>
  );
}
