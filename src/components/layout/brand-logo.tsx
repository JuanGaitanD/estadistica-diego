import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  className?: string;
}

/**
 * Logotipo de StatLab: los palotes de conteo (cuatro rayas y la quinta cruzada)
 * sobre una placa de tinta ciruela. Es el mismo dibujo que `app/icon1.svg`, el
 * favicon y el icono de iOS, con los colores de la acción para que siga el
 * tema. Es decorativo: el nombre accesible lo aporta el texto "StatLab" contiguo.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="7" fill="var(--accion)" />
      <g fill="none" stroke="var(--sobre-accion)" strokeLinecap="round">
        <path d="M7.5 6.5v19M12.8 6.5v19M18.2 6.5v19M23.5 6.5v19" strokeWidth="3" />
        <path d="M4.5 22.5 27.5 9.5" strokeWidth="2.6" />
      </g>
    </svg>
  );
}
