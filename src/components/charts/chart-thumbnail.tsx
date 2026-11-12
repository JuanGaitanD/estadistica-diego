import type { ComponentType } from "react";

import type { ChartKind } from "./chart-registry";

interface ThumbnailProps {
  className?: string | undefined;
}

/** Miniatura de 32×24 con trazos del sistema; decorativa (`aria-hidden`). */
function Thumbnail({ className, children }: ThumbnailProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 24"
      width="32"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

function PieThumbnail({ className }: ThumbnailProps) {
  return (
    <Thumbnail className={className}>
      <circle cx="16" cy="12" r="9" />
      <path d="M16 12 V3 M16 12 L23.8 16.5" />
    </Thumbnail>
  );
}

function BarThumbnail({ className }: ThumbnailProps) {
  return (
    <Thumbnail className={className}>
      <path d="M3 21 H29" />
      <rect x="5" y="12" width="4" height="9" />
      <rect x="11" y="5" width="4" height="16" />
      <rect x="17" y="9" width="4" height="12" />
      <rect x="23" y="14" width="4" height="7" />
    </Thumbnail>
  );
}

function PolygonThumbnail({ className }: ThumbnailProps) {
  return (
    <Thumbnail className={className}>
      <path d="M3 21 H29" />
      <path d="M4 21 L10 11 L16 5 L22 12 L28 21" />
      <circle cx="10" cy="11" r="1" />
      <circle cx="16" cy="5" r="1" />
      <circle cx="22" cy="12" r="1" />
    </Thumbnail>
  );
}

function OgiveThumbnail({ className }: ThumbnailProps) {
  return (
    <Thumbnail className={className}>
      <path d="M3 21 H29" />
      <path d="M4 20 C10 19 12 15 16 11 C20 7 23 5 28 4" />
    </Thumbnail>
  );
}

/** Miniatura de cada tipo de gráfica, para las opciones del paso 3. */
export const CHART_THUMBNAILS: Readonly<Record<ChartKind, ComponentType<ThumbnailProps>>> = {
  pie: PieThumbnail,
  bar: BarThumbnail,
  polygon: PolygonThumbnail,
  ogive: OgiveThumbnail,
};
