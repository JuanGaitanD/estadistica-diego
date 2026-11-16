"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";

import { loadLastDataset } from "@/infrastructure/storage";

/** Zonas de la app que antes vivían en `/#zona`. */
const OLD_HASHES = new Set(["datos", "explorar", "analizar", "informe"]);

/**
 * Enlaces viejos: `/#explorar` lleva a `/app#explorar`. Antes de FL la app
 * vivía en `/`; así no se rompe ningún enlace guardado.
 */
export function LegacyHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (OLD_HASHES.has(hash)) window.location.replace(`/app#${hash}`);
  }, []);
  return null;
}

/** «Seguir con tu último análisis», solo si el navegador guarda datos de una visita anterior. */
export function ResumeLink() {
  const [stored, setStored] = useState(false);
  useEffect(() => {
    // Leer localStorage solo existe en el cliente; el HTML estático sale sin el enlace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored(loadLastDataset() !== null);
  }, []);
  if (!stored) return null;
  return (
    <a href="/app" className={buttonVariants({ variant: "ghost", className: "-ml-4 self-start" })}>
      Seguir con tu último análisis
      <ArrowRight aria-hidden="true" />
    </a>
  );
}
