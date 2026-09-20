"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { HelpCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
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
}

/**
 * Estructura general de la aplicación (docs/05-diseno.md #5a):
 * header con identidad y acciones, contenido con ancho según el paso y
 * pie discreto. La rejilla horizontal (`px-5 sm:px-8`) es la misma en las
 * tres zonas para que todo caiga sobre el mismo eje.
 */
export function AppShell({ children, width = "narrow" }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-5 pt-10 pb-6 sm:px-8",
          WIDTH_CLASS[width],
        )}
      >
        {children}
      </main>
      <AppFooter />
    </div>
  );
}

function AppHeader() {
  return (
    <header className="border-rule bg-background/85 sticky top-0 z-30 border-b backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[84rem] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-primary flex items-center">
            <BrandLogo />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-foreground font-serif text-lg leading-tight font-semibold">
              StatLab
            </span>
            <span className="text-muted-foreground mt-0.5 hidden text-xs leading-tight sm:inline">
              Estadística descriptiva, explicada
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
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
        StatLab · Herramienta educativa de estadística descriptiva
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
      className="size-10 rounded-full"
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
        <Button type="button" variant="ghost" className="h-10 rounded-full px-3.5">
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
            title="Sube o pega tus datos"
            body="Puedes subir un archivo .csv, .xlsx o .txt, o pegar los valores directamente. Nosotros revisamos que estén completos."
          />
          <HelpStep
            index={2}
            title="Confirma el tipo de cada columna"
            body="Adivinamos si cada columna es una categoría (como el sexo) o un número (como la edad). Solo confirma o corrige."
          />
          <HelpStep
            index={3}
            title="Elige qué quieres ver"
            body="Marca las gráficas y los cálculos que te interesan. Puedes cambiar tu selección después."
          />
          <HelpStep
            index={4}
            title="Revisa y exporta tus resultados"
            body="Verás tarjetas con cada medida explicada, tablas y gráficas. Puedes descargarlas cuando quieras."
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
