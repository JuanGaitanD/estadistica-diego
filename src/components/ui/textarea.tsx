import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-card text-foreground placeholder:text-muted-foreground hover:border-muted-foreground disabled:bg-secondary disabled:text-muted-foreground flex field-sizing-content min-h-24 w-full rounded-md border px-3 py-2.5 text-base transition-[border-color] duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed motion-reduce:transition-none",
        "aria-invalid:border-destructive aria-invalid:hover:border-destructive aria-invalid:shadow-[inset_0_0_0_1px_var(--peligro)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
