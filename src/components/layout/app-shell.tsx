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

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Estructura general de la aplicación (docs/05-diseno.md #5a):
 * header con logo, toggle de tema y ayuda; contenido centrado de ancho legible;
 * footer discreto.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}

function AppHeader() {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="text-foreground text-lg font-bold tracking-tight">StatLab</span>
          <span className="text-muted-foreground hidden text-sm sm:inline">
            Calculadora estadística
          </span>
        </div>
        <div className="flex items-center gap-1">
          <HelpSheet />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="border-border border-t py-6">
      <p className="text-muted-foreground mx-auto w-full max-w-5xl px-4 text-center text-sm sm:px-6">
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
        <Button type="button" variant="ghost" size="sm">
          <HelpCircle className="size-4" aria-hidden="true" />
          Ayuda
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cómo usar StatLab</SheetTitle>
          <SheetDescription>Guía rápida en lenguaje sencillo, paso a paso.</SheetDescription>
        </SheetHeader>
        <div className="text-foreground flex flex-col gap-4 overflow-y-auto px-4 pb-6 text-sm">
          <HelpStep
            title="1. Sube o pega tus datos"
            body="Puedes subir un archivo .csv, .xlsx o .txt, o pegar los valores directamente. Nosotros revisamos que estén completos."
          />
          <HelpStep
            title="2. Confirma el tipo de cada columna"
            body="Adivinamos si cada columna es una categoría (como el sexo) o un número (como la edad). Solo confirma o corrige."
          />
          <HelpStep
            title="3. Elige qué quieres ver"
            body="Marca las gráficas y los cálculos que te interesan. Puedes cambiar tu selección después."
          />
          <HelpStep
            title="4. Revisa y exporta tus resultados"
            body="Verás tarjetas con cada medida explicada, tablas y gráficas. Puedes descargarlas cuando quieras."
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HelpStep({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-foreground font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
