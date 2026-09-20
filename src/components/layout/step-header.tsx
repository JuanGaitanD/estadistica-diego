import { cn } from "@/lib/utils";

export interface StepHeaderProps {
  title: string;
  subtitle?: string;
  /** Etiqueta breve en versalitas sobre el título (p. ej. "Paso 1 · Datos"). */
  eyebrow?: string;
  className?: string;
}

/** Pregunta grande (h1) + subtítulo, para el encabezado de cada paso del wizard. */
export function StepHeader({ title, subtitle, eyebrow, className }: StepHeaderProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {eyebrow ? <p className="sl-label mb-2">{eyebrow}</p> : null}
      <h1 className="text-foreground text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.1] font-semibold">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-muted-foreground mt-3 max-w-prose text-[0.9375rem] leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
