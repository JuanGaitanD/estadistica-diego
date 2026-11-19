"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export interface ZoneNavItem {
  id: string;
  title: string;
  hint: string;
  /** Cifra pequeña junto al nombre (por ejemplo, resultados en el informe). */
  badge?: number;
  /** Por qué no se puede entrar todavía; `null` si se puede. */
  blockedReason: string | null;
}

export interface ZoneNavProps {
  items: readonly ZoneNavItem[];
  current: string;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * Pestañas de cuaderno del espacio de trabajo (RF-41). Una zona bloqueada
 * sigue siendo enfocable: al pulsarla se explica qué falta, en vez de
 * quedarse muda.
 */
export function ZoneNav({ items, current, onSelect, className }: ZoneNavProps) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <nav aria-label="Zonas de trabajo" className={cn("w-full", className)}>
      <ol className="border-rule grid grid-cols-5 border-b">
        {items.map((item, index) => {
          const active = item.id === current;
          const blocked = item.blockedReason !== null;
          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                aria-disabled={blocked || undefined}
                onClick={() => {
                  if (blocked) {
                    setNotice(item.blockedReason);
                    return;
                  }
                  setNotice(null);
                  onSelect(item.id);
                }}
                className={cn(
                  "group -mb-px flex min-h-11 w-full min-w-0 flex-col items-start justify-center gap-0.5 border-b-[3px] px-1.5 pt-2 pb-3 text-left transition-colors duration-[90ms] sm:px-4",
                  active
                    ? "border-primary text-foreground"
                    : "text-muted-foreground border-transparent",
                  blocked
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span className="flex max-w-full min-w-0 items-center gap-1 sm:gap-2">
                  <span className="sl-number hidden text-xs sm:inline" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[0.8125rem] sm:text-base",
                      active ? "font-bold" : "font-semibold",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="sl-number bg-primary text-primary-foreground shrink-0 rounded-full px-1 text-[0.6875rem] leading-4 sm:px-1.5 sm:text-xs sm:leading-5">
                      {item.badge}
                      <span className="sr-only"> resultados</span>
                    </span>
                  ) : null}
                </span>
                <span className="hidden max-w-full truncate text-sm lg:block">{item.hint}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p role="status" className="text-muted-foreground min-h-0 pt-2 text-sm empty:hidden">
        {notice}
      </p>
    </nav>
  );
}
