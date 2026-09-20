import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  className?: string;
}

/**
 * Logotipo de StatLab: tres barras ascendentes con un punto de tendencia.
 *
 * Se dibuja íntegramente con `currentColor`, de modo que hereda el color del
 * contenedor y funciona en monocromo y a 16 px. El punto usa `var(--primary)`
 * con `currentColor` de reserva, así que se adapta a las propuestas A, B y C.
 * Es decorativo: el nombre accesible lo aporta el texto "StatLab" contiguo.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <rect x="3" y="19" width="6" height="8" rx="1.5" opacity="0.55" />
        <rect x="12" y="13" width="6" height="14" rx="1.5" opacity="0.78" />
        <rect x="21" y="7" width="6" height="20" rx="1.5" />
      </g>
      <circle cx="24" cy="4" r="3" fill="var(--primary, currentColor)" />
    </svg>
  );
}
