import { cn } from "@/lib/utils";

export interface TallyMarksProps {
  /** Rayas verticales dibujadas (0 a 4). */
  count: number;
  /** Dibuja la quinta raya, diagonal, que cierra el grupo. */
  closed?: boolean;
  /** Las rayas se trazan una a una (120 ms cada una; la quinta, 320 ms). Con movimiento reducido aparecen ya dibujadas. */
  animated?: boolean;
  className?: string;
}

/** x de cada raya vertical dentro de la caja de 30 × 24. */
const STROKE_X = [4, 10, 16, 22] as const;

/**
 * Palotes de conteo: cuatro rayas y la quinta cruzada, el gesto con el que
 * nace toda tabla de frecuencias hecha a mano. Es decorativo (`aria-hidden`);
 * el progreso lo dicen los textos que lo acompañan.
 */
export function TallyMarks({
  count,
  closed = false,
  animated = false,
  className,
}: TallyMarksProps) {
  const visible = Math.max(0, Math.min(4, Math.floor(count)));
  return (
    <svg
      viewBox="0 0 30 24"
      width="30"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0 select-none", className)}
    >
      {STROKE_X.slice(0, visible).map((x, index) => (
        <path
          key={x}
          d={`M${x} 3 V21`}
          pathLength={1}
          className={animated ? "sl-trazo" : undefined}
          style={animated ? { animationDelay: `${index * 120}ms` } : undefined}
        />
      ))}
      {closed ? (
        <path
          d="M2 18 L28 6"
          pathLength={1}
          className={animated ? "sl-trazo sl-trazo-cierre" : undefined}
          style={animated ? { animationDelay: `${visible * 120}ms` } : undefined}
        />
      ) : null}
    </svg>
  );
}
