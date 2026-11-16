import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

/** Texto de StatLab: títulos, cuerpo, etiquetas y botones. Autoalojada en el build. */
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  adjustFontFallback: false,
});

/** Misma familia en monoespaciada: cifras de resultados, datos pegados y fórmulas. */
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  adjustFontFallback: false,
});

const FONT_VARIABLES = [atkinson.variable, atkinsonMono.variable].join(" ");

export const metadata: Metadata = {
  title: "StatLab",
  description:
    "Estadística que se entiende: carga tus datos y obtén, de lo básico a la regresión, qué significa cada resultado. En español, gratis y sin que tus datos salgan del navegador.",
  // Los iconos salen de los archivos de src/app (icon1.svg, icon2.png, apple-icon.png).
};

/** Color de la barra del navegador: el fondo de papel de cada tema. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#12171b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
