"use client";

import { ChevronDown, Menu } from "lucide-react";
import { Fragment, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface NavLink {
  /** Lo que recibe `onSelect`. */
  id: string;
  title: string;
  hint?: string;
  /** Cifra pequeña junto al nombre (por ejemplo, resultados en el informe). */
  badge?: number;
}

export interface NavSection {
  heading?: string;
  links: readonly NavLink[];
}

/** Un enlace suelto o un menú desplegable con secciones. */
export type NavEntry =
  | ({ kind: "link" } & NavLink)
  | { kind: "menu"; id: string; title: string; sections: readonly NavSection[] };

export interface AppNavProps {
  entries: readonly NavEntry[];
  /** Id de la entrada de primer nivel en la que se está. */
  current: string;
  onSelect: (id: string) => void;
}

function Badge({ value }: { value: number | undefined }) {
  if (value === undefined || value <= 0) return null;
  return (
    <span className="sl-number bg-primary text-primary-foreground rounded-full px-1.5 text-xs leading-5">
      {value}
      <span className="sr-only"> resultados</span>
    </span>
  );
}

/**
 * Barra de navegación de la app (docs/05-diseno.md §5a): enlaces y menús
 * desplegables en la barra superior desde `xl`; debajo, un botón «Menú» que
 * abre las mismas entradas en un panel lateral.
 */
export function AppNav({ entries, current, onSelect }: AppNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const itemClass = (active: boolean) =>
    cn(
      "text-foreground relative font-semibold",
      active &&
        "after:bg-primary after:absolute after:inset-x-3 after:-bottom-[0.8125rem] after:h-[3px] after:rounded-full",
    );

  return (
    <>
      <nav aria-label="Principal" className="hidden xl:block">
        <ul className="flex items-center gap-1">
          {entries.map((entry) => {
            const active = entry.id === current;
            if (entry.kind === "link") {
              return (
                <li key={entry.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-current={active ? "page" : undefined}
                    className={itemClass(active)}
                    onClick={() => onSelect(entry.id)}
                  >
                    {entry.title}
                    <Badge value={entry.badge} />
                  </Button>
                </li>
              );
            }
            return (
              <li key={entry.id}>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" className={itemClass(active)}>
                      {entry.title}
                      <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
                      {active ? <span className="sr-only"> (sección actual)</span> : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-80 p-1.5">
                    {entry.sections.map((section, index) => (
                      <Fragment key={section.heading ?? index}>
                        {index > 0 ? <DropdownMenuSeparator /> : null}
                        {section.heading ? (
                          <DropdownMenuLabel className="sl-label px-2 pt-2 pb-1">
                            {section.heading}
                          </DropdownMenuLabel>
                        ) : null}
                        {section.links.map((link) => (
                          <DropdownMenuItem
                            key={link.id}
                            onSelect={() => onSelect(link.id)}
                            className="flex flex-col items-start gap-0.5 py-2"
                          >
                            <span className="text-foreground font-semibold">{link.title}</span>
                            {link.hint ? (
                              <span className="text-muted-foreground text-xs">{link.hint}</span>
                            ) : null}
                          </DropdownMenuItem>
                        ))}
                      </Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="text-foreground has-[>svg]:px-2.5 sm:has-[>svg]:px-4 xl:hidden"
          >
            <Menu aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Menú</SheetTitle>
            <SheetDescription>Elige qué quieres hacer.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Principal" className="overflow-y-auto px-4 pb-6">
            <ul className="flex flex-col gap-5">
              {entries.map((entry) => {
                const links: readonly NavSection[] =
                  entry.kind === "link" ? [{ links: [entry] }] : entry.sections;
                return (
                  <li key={entry.id} className="border-rule border-t pt-4 first:border-t-0">
                    {entry.kind === "menu" ? <p className="sl-label mb-2">{entry.title}</p> : null}
                    {links.map((section, index) => (
                      <div key={section.heading ?? index} className="flex flex-col">
                        {section.heading ? (
                          <p className="text-muted-foreground mt-2 mb-1 text-xs font-semibold">
                            {section.heading}
                          </p>
                        ) : null}
                        {section.links.map((link) => (
                          <button
                            key={link.id}
                            type="button"
                            className="hover:bg-accent/60 flex min-h-11 flex-col items-start justify-center rounded-md px-2 py-1.5 text-left"
                            onClick={() => {
                              setSheetOpen(false);
                              onSelect(link.id);
                            }}
                          >
                            <span className="text-foreground flex items-center gap-2 font-semibold">
                              {link.title}
                              <Badge value={link.badge} />
                            </span>
                            {link.hint ? (
                              <span className="text-muted-foreground text-xs">{link.hint}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
