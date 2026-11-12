import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border px-4 py-3 text-base has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-5 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        /** Información: hoja con borde e icono secundario. */
        default: "border-border bg-card text-card-foreground [&>svg]:text-muted-foreground",
        info: "border-border bg-card text-card-foreground [&>svg]:text-muted-foreground",
        /** Aviso: tinte ocre con icono ocre; el texto sigue en el color del tema. */
        aviso: "border-aviso/50 bg-aviso-suave text-card-foreground [&>svg]:text-aviso",
        /** Error recuperable: tinte rojo de corrección, borde de 1 px, icono y título en peligro. */
        destructive:
          "border-destructive bg-peligro-suave text-destructive *:data-[slot=alert-description]:text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 min-h-4 font-semibold", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-foreground col-start-2 grid justify-items-start gap-1 text-base [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
