"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { HelpCircle, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { BrandLogo } from "./brand-logo";

/** Ancho del contenedor: angosto para el asistente, ancho para resultados. */
export type ShellWidth = "narrow" | "wide";

const WIDTH_CLASS: Readonly<Record<ShellWidth, string>> = {
  narrow: "max-w-3xl",
  wide: "max-w-[84rem]",
};

export interface AppShellProps {
  children: ReactNode;
  /**
   * Ancho máximo del contenido. El header y el pie usan siempre el ancho
   * mayor, de modo que la marca y el contenido comparten el mismo margen
   * exterior sin importar el paso. Por defecto "narrow".
   */
  width?: ShellWidth;
  /** Acciones globales de la página, en la barra superior junto a Ayuda y el tema. */
  actions?: ReactNode;
  /** Navegación principal, en la barra superior junto a la marca. */
  nav?: ReactNode;
  /** Panel a la derecha del contenido, debajo del header (por ejemplo, el modo guiado). */
  aside?: ReactNode;
  /**
   * Qué hace la marca (logo y nombre): si se pasa, la marca es un botón con
   * esta acción (por ejemplo, volver al tablero); si no, enlaza a la portada.
   */
  onBrand?: () => void;
}

/**
 * Estructura general de la aplicación (docs/05-diseno.md #5a):
 * header con identidad y acciones, contenido con ancho según el paso y
 * pie discreto. La rejilla horizontal (`px-5 sm:px-8`) es la misma en las
 * tres zonas para que todo caiga sobre el mismo eje.
 */
export function AppShell({
  children,
  width = "narrow",
  actions,
  nav,
  aside,
  onBrand,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <a href="#contenido" className={cn(buttonVariants({ variant: "outline" }), "sl-salto")}>
        Saltar al contenido
      </a>
      <AppHeader actions={actions} nav={nav} {...(onBrand !== undefined ? { onBrand } : {})} />
      <div className="flex flex-1">
        <main
          id="contenido"
          tabIndex={-1}
          className={cn(
            "outline-none",
            "mx-auto flex w-full min-w-0 flex-1 flex-col px-5 pt-10 pb-6 sm:px-8",
            WIDTH_CLASS[width],
          )}
        >
          {children}
        </main>
        {aside}
      </div>
      <AppFooter />
    </div>
  );
}

const BRAND_CLASS =
  "focus-visible:ring-ring flex items-center gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:outline-none";

function AppHeader({
  actions,
  nav,
  onBrand,
}: {
  actions?: ReactNode;
  nav?: ReactNode;
  onBrand?: () => void;
}) {
  const brand = (
    <>
      <span className="text-primary flex items-center">
        <BrandLogo />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-foreground font-serif text-lg leading-tight font-semibold">
          StatLab
        </span>
        <span className="text-muted-foreground mt-0.5 hidden text-xs leading-tight sm:inline">
          Estadística que se entiende
        </span>
      </span>
    </>
  );
  return (
    // Alto fijo (h-16): el panel lateral se pega justo debajo con `top-16`.
    <header className="border-rule bg-background sticky top-0 z-30 h-16 border-b">
      <div className="mx-auto flex h-full w-full max-w-[84rem] items-center justify-between gap-2 px-5 sm:gap-4 sm:px-8">
        <div className="flex items-center gap-1 sm:gap-3 xl:gap-6">
          {onBrand !== undefined ? (
            <button
              type="button"
              className={BRAND_CLASS}
              onClick={onBrand}
              aria-label="StatLab: ir al inicio"
            >
              {brand}
            </button>
          ) : (
            <Link href="/" className={BRAND_CLASS} aria-label="StatLab: ir a la portada">
              {brand}
            </Link>
          )}
          {nav}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {actions !== undefined ? (
            <>
              <div className="flex items-center gap-1 sm:gap-2">{actions}</div>
              <span aria-hidden="true" className="bg-rule mx-1 hidden h-6 w-px sm:block" />
            </>
          ) : null}
          <HelpSheet />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="border-rule mt-10 border-t py-7">
      <p className="text-muted-foreground mx-auto w-full max-w-[84rem] px-5 text-xs sm:px-8">
        StatLab · Estadística que se entiende: de lo básico a la regresión. Tus datos no salen de tu
        navegador.
      </p>
    </footer>
  );
}

const emptySubscribe = () => () => {};

/** Indica si ya se hidrató en el cliente, sin causar cascada de renders. */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHasMounted();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-foreground"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function HelpSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="text-foreground has-[>svg]:px-2.5 sm:has-[>svg]:px-4"
          aria-label="Ayuda"
        >
          <HelpCircle className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Ayuda</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cómo usar StatLab</SheetTitle>
          <SheetDescription>Guía rápida en lenguaje sencillo, paso a paso.</SheetDescription>
        </SheetHeader>
        <div className="text-foreground flex flex-col gap-5 overflow-y-auto px-4 pb-6 text-sm">
          <HelpStep
            index={1}
            title="Elige qué quieres hacer"
            body="En Inicio están las cuatro puertas: estadística básica, estadística avanzada, evaluar un proyecto y tu informe. El menú de arriba lleva a lo mismo desde cualquier pantalla."
          />
          <HelpStep
            index={2}
            title="Sube o pega tus datos"
            body="Puedes subir un archivo .csv, .xlsx o .txt, pegar los valores o escribirlos en una tabla. Adivinamos si cada columna es una categoría o un número; solo confirma o corrige."
          />
          <HelpStep
            index={3}
            title="Lee primero qué significa"
            body="Cada resultado empieza por su interpretación en llano. El cálculo paso a paso queda plegado en «Ver cómo se calculó»."
          />
          <HelpStep
            index={4}
            title="Junta lo que te sirve en tu informe"
            body="Añade resultados a «Mis informes» y descárgalos en PDF o Excel. Con «Proyecto → Guardar» sigues otro día donde quedaste."
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HelpStep({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <div className="border-rule flex gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      <span className="bg-secondary text-secondary-foreground sl-number mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs">
        {index}
      </span>
      <div>
        <h3 className="text-foreground font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1">{body}</p>
      </div>
    </div>
  );
}
