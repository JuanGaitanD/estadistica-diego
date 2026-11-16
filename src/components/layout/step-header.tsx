import { cn } from "@/lib/utils";

export interface StepHeaderProps {
  title: string;
  subtitle?: string;
  /** Etiqueta breve sobre el título. Los pasos ya no la usan: el stepper dice en qué paso estás. */
  eyebrow?: string;
  /** 2 cuando la cabecera va dentro de otra pantalla que ya tiene su título. */
  level?: 1 | 2;
  className?: string;
}

/** Pregunta grande (h1) + subtítulo, para el encabezado de cada paso del wizard. */
export function StepHeader({ title, subtitle, eyebrow, level = 1, className }: StepHeaderProps) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={cn("flex flex-col", className)}>
      {eyebrow ? <p className="sl-label mb-2">{eyebrow}</p> : null}
      <Heading
        className={cn(
          "text-foreground leading-[1.1]",
          level === 1 ? "text-[2.125rem] sm:text-[2.75rem]" : "text-[1.625rem] sm:text-[2rem]",
        )}
      >
        {title}
      </Heading>
      {subtitle ? (
        <p className="text-muted-foreground mt-3 max-w-prose text-base">{subtitle}</p>
      ) : null}
    </div>
  );
}
