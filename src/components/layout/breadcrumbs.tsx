import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Crumb {
  readonly label: string;
  /** Sin `href` es la página actual (la última). */
  readonly href?: string;
}

/** Migas de pan: dónde estás dentro de materia → unidad → actividad. Funciona en el servidor. */
export function Breadcrumbs({ items, className }: { items: readonly Crumb[]; className?: string }) {
  return (
    <nav aria-label="Ruta" className={cn("min-w-0 text-label text-muted-foreground", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${i}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="truncate rounded-sm hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last && "font-medium text-ink")}>
                  {item.label}
                </span>
              )}
              {last ? null : (
                <span aria-hidden className="text-border-strong">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
