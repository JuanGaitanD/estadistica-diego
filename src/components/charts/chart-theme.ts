import { createElement, type CSSProperties } from "react";

/**
 * Estilo común de las gráficas (docs/05-diseno.md §6).
 *
 * Recharts trae por defecto una rejilla punteada en los dos ejes, un tooltip
 * blanco del sistema y ejes en gris fijo; nada de eso responde al tema ni al
 * modo oscuro. Estas constantes centralizan el tratamiento para que las cuatro
 * gráficas se vean como una sola familia y hereden los tokens de la propuesta
 * de diseño activa. Los colores concretos se resuelven en CSS
 * (`.sl-chart` en globals.css); aquí solo va lo que Recharts exige por props.
 */

/** Rejilla de papel milimetrado: líneas continuas en los dos ejes con --cuadricula (CSS). */
export const GRID_PROPS = {
  vertical: true,
  strokeDasharray: "0",
} as const;

/** Ejes: sin línea de dominio pesada, tipografía y color desde CSS. */
export const AXIS_PROPS = {
  tickLine: false,
  axisLine: true,
  tick: { fontSize: 12 },
  tickMargin: 8,
} as const;

/** Contenedor del tooltip, con los tokens del tema. */
export const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--separador)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--sombra-flotante)",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  lineHeight: 1.35,
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "var(--foreground)",
  fontWeight: 600,
  marginBottom: "0.125rem",
};

export const TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "var(--muted-foreground)",
  padding: 0,
};

/** Resaltado bajo el cursor: un velo suave, no la banda gris de fábrica. */
export const TOOLTIP_CURSOR = { fill: "var(--muted)", fillOpacity: 0.55 } as const;
export const TOOLTIP_LINE_CURSOR = { stroke: "var(--rule-strong)", strokeWidth: 1 } as const;

/** Props comunes de `<Tooltip>` para gráficas de barras/tarta. */
export const TOOLTIP_PROPS = {
  contentStyle: TOOLTIP_CONTENT_STYLE,
  labelStyle: TOOLTIP_LABEL_STYLE,
  itemStyle: TOOLTIP_ITEM_STYLE,
  cursor: TOOLTIP_CURSOR,
} as const;

/** Props comunes de `<Tooltip>` para gráficas de líneas. */
export const TOOLTIP_LINE_PROPS = {
  contentStyle: TOOLTIP_CONTENT_STYLE,
  labelStyle: TOOLTIP_LABEL_STYLE,
  itemStyle: TOOLTIP_ITEM_STYLE,
  cursor: TOOLTIP_LINE_CURSOR,
} as const;

/**
 * Leyenda debajo, en texto: Recharts tiñe el texto con el color de la serie, que
 * no llega a 4,5:1; el color queda solo en la muestra y el texto va en --foreground.
 */
export const LEGEND_PROPS = {
  iconType: "circle",
  iconSize: 8,
  wrapperStyle: { fontSize: "0.875rem", paddingTop: "0.75rem" },
  formatter: (value: unknown) =>
    createElement("span", { style: { color: "var(--foreground)" } }, String(value)),
} as const;
