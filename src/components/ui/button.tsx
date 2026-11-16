import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Base: shadcn/ui (new-york v4), adaptado al sistema "Arcano" (ADR-020).
const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Lo que se toca responde al presionar (.tactile). `cta` es la acción principal de una pantalla: lleva glow.
        default: "tactile bg-primary text-primary-foreground hover:brightness-110",
        cta: "tactile glow bg-primary text-primary-foreground hover:brightness-110",
        secondary: "tactile border bg-surface-2 text-foreground hover:border-border-strong hover:bg-surface-3",
        destructive: "tactile bg-danger text-danger-ink hover:brightness-110",
        outline: "tactile border border-border-strong bg-transparent text-foreground hover:bg-surface-2",
        ghost: "tactile text-foreground hover:bg-surface-2",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        // En modo táctil (`touch:`) todo mide ≥ 44 pt; en la Mac no cambia.
        default: "h-10 px-4 has-[>svg]:px-3 touch:h-11",
        sm: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5 touch:h-11",
        lg: "h-12 px-6 text-base has-[>svg]:px-5",
        icon: "size-10 touch:size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
