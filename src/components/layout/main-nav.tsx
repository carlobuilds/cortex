"use client";

import { ChevronDown, Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOTTOM_MORE, BOTTOM_NAV, hidesBottomBar, isFocusRoute, MORE_NAV, navMatch, PRIMARY_NAV, type NavItem } from "./nav-items";

/** `aria-current` solo en la página exacta; `data-active` también dentro de la sección (pinta igual). */
function activeProps(pathname: string, href: string) {
  const match = navMatch(pathname, href);
  return { "aria-current": match === "page" ? ("page" as const) : undefined, "data-active": match ? "" : undefined };
}

/** Navegación de escritorio (lg+; en tablets manda la barra inferior). En las rutas de foco no se dibuja: ahí mandan las migas y Salir. */
export function DesktopNav() {
  const pathname = usePathname();
  if (isFocusRoute(pathname)) return null;
  const moreActive = MORE_NAV.some((i) => navMatch(pathname, i.href));
  return (
    <nav aria-label="Principal" className="hidden items-center gap-0.5 text-sm lg:flex">
      {PRIMARY_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          {...activeProps(pathname, item.href)}
          className="rounded-md px-2.5 py-1.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink data-[active]:bg-brand-soft data-[active]:text-brand"
        >
          {item.label}
        </Link>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          data-active={moreActive ? "" : undefined}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink data-[active]:bg-brand-soft data-[active]:text-brand"
        >
          Más <ChevronDown aria-hidden className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {MORE_NAV.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} {...activeProps(pathname, item.href)} className="data-[active]:text-brand">
                <item.icon aria-hidden /> {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

function BottomTab({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <Link
      href={item.href}
      {...activeProps(pathname, item.href)}
      className="group flex flex-1 flex-col items-center justify-center gap-1 rounded-md text-caption font-medium text-ink-2 data-[active]:text-brand"
    >
      <span className="grid h-7 w-12 place-items-center rounded-full group-data-[active]:bg-brand-soft">
        <item.icon aria-hidden className="size-5" />
      </span>
      {item.label}
    </Link>
  );
}

/**
 * Barra inferior del celular y la tablet (< lg): 4 destinos al alcance del pulgar + "Más" en una hoja.
 * Deja su propio espacio al final de la página para no tapar el contenido.
 */
export function BottomBar() {
  const pathname = usePathname();
  if (hidesBottomBar(pathname)) return null;
  const moreActive = BOTTOM_MORE.some((i) => navMatch(pathname, i.href));
  return (
    <>
      <div aria-hidden className="h-[calc(var(--bottom-bar-h)+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex h-[var(--bottom-bar-h)] max-w-md items-stretch px-2 py-1.5">
          {BOTTOM_NAV.map((item) => (
            <BottomTab key={item.href} item={item} pathname={pathname} />
          ))}
          <Sheet>
            <SheetTrigger
              data-active={moreActive ? "" : undefined}
              className="group flex flex-1 flex-col items-center justify-center gap-1 rounded-md text-caption font-medium text-ink-2 data-[active]:text-brand"
            >
              <span className="grid h-7 w-12 place-items-center rounded-full group-data-[active]:bg-brand-soft">
                <Ellipsis aria-hidden className="size-5" />
              </span>
              Más
            </SheetTrigger>
            <SheetContent side="bottom" aria-describedby={undefined}>
              <SheetTitle>Más</SheetTitle>
              <ul className="grid gap-1">
                {BOTTOM_MORE.map((item) => (
                  <li key={item.href}>
                    <SheetClose asChild>
                      <Link
                        href={item.href}
                        {...activeProps(pathname, item.href)}
                        className={cn("flex items-center gap-3 rounded-md px-3 py-3 font-medium hover:bg-surface-2", "data-[active]:bg-brand-soft data-[active]:text-brand")}
                      >
                        <item.icon aria-hidden className="size-5 text-ink-2" /> {item.label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
