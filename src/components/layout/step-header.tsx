import { cn } from "@/lib/utils";

export interface StepHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/** Pregunta grande (h1) + subtítulo, para el encabezado de cada paso del wizard. */
export function StepHeader({ title, subtitle, className }: StepHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h1 className="text-foreground text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="text-muted-foreground text-base">{subtitle}</p> : null}
    </div>
  );
}
