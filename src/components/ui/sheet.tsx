"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { DialogOverlay } from "./dialog";

// Base: shadcn/ui (new-york v4) sobre el Dialog de Radix: foco atrapado, Esc cierra y el foco regresa al disparador.
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SIDES = {
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t pb-[env(safe-area-inset-bottom)] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
  right: "inset-y-0 right-0 h-full w-[min(20rem,85vw)] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
} as const;

function SheetContent({ className, children, side = "bottom", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: keyof typeof SIDES }) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "raised fixed z-50 flex flex-col gap-4 overflow-y-auto bg-surface p-5 text-foreground",
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
          SIDES[side],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="tactile absolute top-3 right-3 grid size-8 touch:size-11 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink">
          <X aria-hidden className="size-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="sheet-title" className={cn("text-base font-semibold", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger };
