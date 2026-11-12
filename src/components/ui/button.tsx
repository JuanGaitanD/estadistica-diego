import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";

/*
 * Botón con cuerpo (docs/05-diseno.md): cara + canto de 3 px como border-bottom
 * un paso más oscuro. El canto está dentro del alto total (44 px = 41 + 3), así
 * que al hundirse (translateY 3 px y canto transparente) nada se mueve alrededor.
 * `ghost` y `link` son terciarios planos: sin canto, mismo alto.
 */
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-clip-padding text-base font-semibold whitespace-nowrap",
    "transition-[background-color,color,transform,border-color] duration-[90ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
    "disabled:pointer-events-none data-[loading=true]:pointer-events-none",
    "motion-reduce:transition-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-b-[3px] border-b-[var(--accion-canto)] bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.18)]",
          "hover:bg-[var(--accion-hover)] active:translate-y-[3px] active:border-b-transparent active:shadow-none",
          "disabled:translate-y-[3px] disabled:border-b-transparent disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none",
        ],
        destructive: [
          "border-b-[3px] border-b-[var(--peligro-canto)] bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.18)]",
          "hover:bg-[color-mix(in_oklab,var(--peligro)_88%,var(--texto))] active:translate-y-[3px] active:border-b-transparent active:shadow-none",
          "disabled:translate-y-[3px] disabled:border-b-transparent disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none",
        ],
        outline: [
          "border border-b-[3px] border-input bg-card text-foreground",
          "hover:bg-secondary active:translate-y-[3px] active:border-b-transparent",
          "disabled:translate-y-[3px] disabled:border-border disabled:border-b-transparent disabled:bg-secondary disabled:text-muted-foreground",
        ],
        ghost: [
          "text-primary hover:bg-accent focus-visible:bg-accent active:bg-accent",
          "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-[var(--accion-hover)]",
          "disabled:text-muted-foreground",
        ],
        link: "text-primary hover:bg-accent focus-visible:bg-accent disabled:text-muted-foreground",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-3 text-sm has-[>svg]:px-2.5",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Conserva cuerpo y ancho, muestra el indicador y no admite un segundo envío. */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading ? true : undefined}
      aria-disabled={loading ? true : undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={
        loading ? (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick
      }
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : null}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
