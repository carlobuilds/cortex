"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Base: shadcn/ui (new-york v4), transcrito a mano (ADR-016) con los tokens de ADR-020.
// Control segmentado: lo elegido lleva fondo brand-soft y texto brand (par AA en tokens.test.ts).
function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("inline-flex items-center gap-1 rounded-lg border bg-surface-2 p-1", className)}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "tactile inline-flex h-8 touch:h-11 touch:min-w-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-ink-2 hover:text-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        "data-[state=on]:bg-brand-soft data-[state=on]:text-brand",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
