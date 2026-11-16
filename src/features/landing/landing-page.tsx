import { ArrowRight, Check, Clock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { TallyMarks } from "@/components/layout/tally-marks";
import { InterpretationPanel } from "@/components/shared/interpretation-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { LandingDemo } from "./landing-demo";
import { LegacyHashRedirect, ResumeLink } from "./landing-client";
import { sampleInsights } from "./sample-insights";

const APP = "/app";
const SAMPLE = "/app#ejemplo";

const STEPS = [
  {
    title: "Trae tus datos",
    body: "Pega una tabla desde Excel o Google Sheets, sube un archivo CSV o Excel, o escríbelos en la hoja. StatLab reconoce qué columnas son números y cuáles son categorías.",
  },
  {
    title: "Lee qué significan",
    body: "Cada resultado llega con una frase en palabras simples: cuál es el valor típico, cuánto varían los datos, qué grupos se parecen. El cálculo queda a un clic, si lo quieres ver.",
  },
  {
    title: "Llévate el informe",
    body: "Añade al informe lo que te sirva y descárgalo en PDF o Excel, o copia tablas y gráficos para pegarlos en tu trabajo.",
  },
] as const;

const MODULES: readonly { name: string; detail: string; ready: boolean }[] = [
  {
    name: "Frecuencias y gráficos",
    detail: "Tablas simples y por intervalos, histograma, caja, Pareto y circular",
    ready: true,
  },
  {
    name: "Medidas de resumen",
    detail: "Promedio, mediana, dispersión, forma y percentiles",
    ready: true,
  },
  { name: "Tablas cruzadas", detail: "Cómo se reparten dos variables a la vez", ready: true },
  {
    name: "Correlación y regresión lineal",
    detail: "La recta que mejor resume la relación, paso a paso",
    ready: true,
  },
  {
    name: "Probabilidad e intervalos",
    detail: "Distribuciones, normalidad e intervalos de confianza",
    ready: true,
  },
  {
    name: "Pruebas de hipótesis",
    detail: "Comparar grupos, promedios y proporciones, con un selector que te guía",
    ready: true,
  },
  {
    name: "Regresión múltiple y logística",
    detail: "Varias variables a la vez, curvas y resultados de sí o no",
    ready: true,
  },
];

const EXPORTS = [
  { format: "PDF", what: "El informe completo, listo para entregar" },
  { format: "Excel", what: "Las tablas en hojas, con sus números" },
  { format: "CSV", what: "Cada tabla, para abrirla donde quieras" },
  { format: "PNG · SVG", what: "Los gráficos como imagen" },
  { format: "Copiar", what: "Tablas, gráficos y frases al portapapeles" },
  { format: ".statlab.json", what: "Tu proyecto, para seguir otro día" },
] as const;

function Section({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("sl-revelar py-14 sm:py-20", className)}>
      <p className="sl-label">{eyebrow}</p>
      <h2 id={id} className="mt-2 max-w-2xl text-3xl leading-tight font-semibold sm:text-4xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Portada de StatLab en `/` (fase FL, docs/05-diseno.md «Aterrizaje»). Es
 * estática: las frases del ejemplo y de la demo las calcula el motor en el
 * build con los datos de ejemplo que trae la app.
 */
export function LandingPage() {
  const insights = sampleInsights();
  const wrap = "mx-auto w-full max-w-[84rem] px-5 sm:px-8";

  return (
    <div className="flex min-h-full flex-col">
      <LegacyHashRedirect />
      <a href="#contenido" className={cn(buttonVariants({ variant: "outline" }), "sl-salto")}>
        Saltar al contenido
      </a>
      <header className="border-rule bg-background sticky top-0 z-30 border-b">
        <div className={cn(wrap, "flex items-center justify-between gap-4 py-3")}>
          <Link href="/" className="flex min-h-11 items-center gap-3" aria-label="StatLab, inicio">
            <span className="text-primary flex items-center">
              <BrandLogo />
            </span>
            <span className="text-foreground text-lg font-semibold">StatLab</span>
          </Link>
          <a href={APP} className={buttonVariants()}>
            Abrir StatLab
          </a>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1 outline-none">
        {/* Primera pantalla: mensaje a la izquierda, el producto funcionando a la derecha. */}
        <div
          className={cn(wrap, "grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1.05fr]")}
        >
          <div className="sl-cascada flex flex-col gap-6">
            <p className="sl-label flex items-center gap-2">
              <TallyMarks count={4} closed animated className="text-primary" />
              Gratis · tus datos no salen de tu navegador
            </p>
            <h1 className="text-[2.5rem] leading-[1.05] font-semibold tracking-tight sm:text-[3.5rem] xl:text-[4.25rem]">
              Estadística que se entiende
            </h1>
            <p className="text-muted-foreground -mt-2 text-xl sm:text-2xl">
              de lo básico a la regresión
            </p>
            <p className="max-w-xl text-lg leading-relaxed">
              Pega tus datos y StatLab te dice qué significan, en palabras simples. Si quieres ver
              cómo se calculó, el paso a paso está a un clic, con la fórmula de Excel que hace lo
              mismo.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={APP} className={cn(buttonVariants(), "px-7")}>
                Empezar con mis datos
                <ArrowRight aria-hidden="true" />
              </a>
              <a href={SAMPLE} className={buttonVariants({ variant: "outline" })}>
                Probar con datos de ejemplo
              </a>
            </div>
            <ResumeLink />
          </div>
          <div className="sl-cascada-tarde min-w-0">
            <LandingDemo insights={insights} />
          </div>
        </div>

        <div className={wrap}>
          <Section
            id="para-quien"
            eyebrow="Para quién es"
            title="Para quien tiene datos y una pregunta, no un título en estadística"
          >
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="sl-surface p-6 sm:p-8">
                <p className="text-lg leading-relaxed">
                  Estudiantes que aprenden estadística, docentes que la enseñan y cualquier persona
                  que necesita sacar conclusiones de una tabla: notas de un curso, ventas del mes,
                  respuestas de una encuesta.
                </p>
                <p className="text-muted-foreground mt-4 leading-relaxed">
                  No hace falta saber qué prueba usar ni cómo se lee un coeficiente: StatLab lo
                  explica en cada resultado.
                </p>
              </div>
              <ul className="sl-surface flex flex-col gap-4 p-6 sm:p-8">
                {[
                  "Sin crear cuenta ni instalar nada",
                  "Funciona en el celular y en el computador",
                  "Tus datos se quedan en tu navegador",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check aria-hidden="true" className="text-primary mt-0.5 size-5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section
            id="como-se-usa"
            eyebrow="Cómo se usa"
            title="Tres pasos, de la tabla al informe"
            className="border-rule border-t"
          >
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-3">
                  <TallyMarks count={index + 1} className="text-primary" />
                  <h3 className="text-xl font-semibold">
                    <span className="sr-only">Paso {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section
            id="ejemplo"
            eyebrow="Un ejemplo real"
            title="Así responde StatLab"
            className="border-rule border-t"
          >
            <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_1.6fr]">
              <div className="flex flex-col gap-4">
                <p className="text-lg leading-relaxed">
                  Estos son los datos de ejemplo que trae la app: las notas de {insights.rowCount}{" "}
                  estudiantes. El texto de la derecha es el que escribe StatLab al analizarlas;
                  nadie lo redactó a mano.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Abre «Ver cómo se calculó» para ver cada paso, con su fórmula.
                </p>
                <a
                  href={SAMPLE}
                  className={cn(buttonVariants({ variant: "ghost" }), "-ml-4 self-start")}
                >
                  Abrir este ejemplo en StatLab
                  <ArrowRight aria-hidden="true" className="size-4" />
                </a>
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <InterpretationPanel
                  name={insights.variable}
                  title={`Qué significa · ${insights.variable}`}
                  interpretation={insights.interpretation}
                  steps={insights.steps}
                />
                <InterpretationPanel
                  name={insights.crossTitle}
                  title={`Qué significa · ${insights.crossTitle}`}
                  interpretation={insights.crossInterpretation}
                />
              </div>
            </div>
          </Section>

          <Section
            id="modulos"
            eyebrow="Qué puedes hacer"
            title="De lo básico a la regresión"
            className="border-rule border-t"
          >
            <ul className="border-rule mt-10 grid border-t md:grid-cols-2 md:gap-x-10">
              {MODULES.map((module) => (
                <li
                  key={module.name}
                  className="border-rule flex items-start justify-between gap-4 border-b py-4"
                >
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">{module.name}</span>
                    <span className="text-muted-foreground text-sm">{module.detail}</span>
                  </span>
                  {module.ready ? (
                    <span className="text-primary flex shrink-0 items-center gap-1 text-sm font-semibold">
                      <Check aria-hidden="true" className="size-4" />
                      Disponible
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-sm">
                      <Clock aria-hidden="true" className="size-4" />
                      En construcción
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="exportar"
            eyebrow="Qué te llevas"
            title="Tus resultados, en el formato que pidan"
            className="border-rule border-t"
          >
            <dl className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {EXPORTS.map((item) => (
                <div key={item.format} className="flex flex-col gap-1">
                  <dt className="text-primary font-mono text-lg font-semibold">{item.format}</dt>
                  <dd className="text-muted-foreground">{item.what}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>

        {/* Cierre: el único cambio fuerte de ritmo, en ciruela. */}
        <section aria-labelledby="empezar" className="bg-primary text-primary-foreground">
          <div
            className={cn(
              wrap,
              "sl-revelar flex flex-col items-start gap-6 py-16 sm:py-20 md:flex-row md:items-center md:justify-between",
            )}
          >
            <div>
              <h2 id="empezar" className="text-3xl leading-tight font-semibold sm:text-4xl">
                Tu primera tabla, entendida en un minuto
              </h2>
              <p className="mt-3 text-lg opacity-90">Sin cuenta, sin instalar nada.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={APP} className={cn(buttonVariants({ variant: "outline" }), "px-7")}>
                Empezar con mis datos
                <ArrowRight aria-hidden="true" />
              </a>
              <a
                href={SAMPLE}
                className="sl-cierre-enlace inline-flex h-11 items-center justify-center rounded-md px-5 font-semibold"
              >
                Probar con datos de ejemplo
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-rule border-t py-7">
        <p className={cn(wrap, "text-muted-foreground text-xs")}>
          StatLab · Estadística que se entiende: de lo básico a la regresión. Tus datos no salen de
          tu navegador.
        </p>
      </footer>
    </div>
  );
}
