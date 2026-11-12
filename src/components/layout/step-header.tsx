import { cn } from "@/lib/utils";

export interface StepHeaderProps {
  title: string;
  subtitle?: string;
  /** Etiqueta breve sobre el título. Los pasos ya no la usan: el stepper dice en qué paso estás. */
  eyebrow?: string;
  className?: string;
}

/** Pregunta grande (h1) + subtítulo, para el encabezado de cada paso del wizard. */
export function StepHeader({ title, subtitle, eyebrow, className }: StepHeaderProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {eyebrow ? <p className="sl-label mb-2">{eyebrow}</p> : null}
      <h1 className="text-foreground text-[2.125rem] leading-[1.1] sm:text-[2.75rem]">{title}</h1>
      {subtitle ? (
        <p className="text-muted-foreground mt-3 max-w-prose text-base">{subtitle}</p>
      ) : null}
    </div>
  );
}
