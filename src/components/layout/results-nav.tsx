"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface ResultsNavLink {
  /** `id` del elemento destino, ya presente en el DOM. */
  readonly id: string;
  readonly label: string;
}

export interface ResultsNavGroup {
  readonly key: string;
  readonly label: string;
  /** Tipo de variable u otra anotación breve. */
  readonly hint?: string;
  readonly links: readonly ResultsNavLink[];
}

export interface ResultsNavProps {
  readonly groups: readonly ResultsNavGroup[];
  readonly className?: string;
}

/**
 * Observa qué sección está visible para resaltarla en el índice.
 * Se usa `IntersectionObserver` con un margen superior que compensa la
 * cabecera pegajosa; si el navegador no lo soporta, el índice sigue
 * funcionando como lista de anclas sin resaltado.
 */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = key
      .split("|")
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: 0 },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [key]);

  return active;
}

/**
 * Índice de la pantalla de resultados: lista las variables y sus bloques y
 * ancla a los `id` que ya emite `features/analysis`
 * (`section-<variable>-<bloque>`). Pegajoso en escritorio (columna lateral) y
 * en móvil una tira horizontal bajo la cabecera.
 */
export function ResultsNav({ groups, className }: ResultsNavProps) {
  const ids = groups.flatMap((group) => group.links.map((link) => link.id));
  const active = useActiveSection(ids);

  if (groups.length === 0) return null;

  return (
    <nav
      aria-label="Secciones del análisis"
      className={cn("lg:sticky lg:top-24 lg:self-start", className)}
    >
      {/* Escritorio: índice vertical. */}
      <div className="hidden max-h-[calc(100vh-9rem)] flex-col gap-5 overflow-y-auto pr-2 lg:flex">
        <p className="sl-label">En esta página</p>
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-foreground truncate text-sm font-semibold">{group.label}</p>
            {group.hint ? (
              <p className="text-muted-foreground mt-0.5 text-sm">{group.hint}</p>
            ) : null}
            <ul className="border-rule mt-2 flex flex-col border-l">
              {group.links.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    aria-current={active === link.id ? "true" : undefined}
                    className={cn(
                      "relative flex min-h-9 items-center py-1.5 pl-4 text-sm transition-colors",
                      active === link.id
                        ? "text-primary before:bg-primary font-semibold before:absolute before:left-1.5 before:h-4 before:w-0.5 before:rounded-full"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Móvil y tableta: tira de anclas de una línea. */}
      <div className="border-rule bg-background sticky top-[4.25rem] z-20 -mx-5 border-b px-5 py-2 lg:hidden">
        <ul className="flex gap-1.5 overflow-x-auto pb-1">
          {groups.map((group) => (
            <li key={group.key} className="shrink-0">
              <a
                href={`#${group.links[0]?.id ?? ""}`}
                className="bg-secondary text-secondary-foreground hover:bg-accent inline-flex min-h-11 items-center rounded-md px-3.5 text-sm font-semibold transition-colors"
              >
                {group.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
