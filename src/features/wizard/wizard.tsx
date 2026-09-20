"use client";

/**
 * Composición del asistente completo: cabecera de la aplicación, stepper,
 * el paso vigente y la barra de navegación fija (docs/05-diseno.md §5a).
 */
import { useEffect, useRef } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Stepper } from "@/components/layout/stepper";
import { Button } from "@/components/ui/button";

import { WIZARD_STEPS, type StepIndex } from "./model/types";
import { StepCalculations } from "./steps/step-calculations";
import { StepData } from "./steps/step-data";
import { StepResults } from "./steps/step-results";
import { StepVariables } from "./steps/step-variables";
import { useWizardStore } from "./store/wizard-store";

const STEPS = WIZARD_STEPS.map((step) => ({ id: step.id, title: step.title }));

function StepContent({ step }: { step: StepIndex }) {
  if (step === 0) return <StepData />;
  if (step === 1) return <StepVariables />;
  if (step === 2) return <StepCalculations />;
  return <StepResults />;
}

export function Wizard() {
  const step = useWizardStore((state) => state.step);
  const goNext = useWizardStore((state) => state.goNext);
  const goBack = useWizardStore((state) => state.goBack);
  const goToStep = useWizardStore((state) => state.goToStep);
  const canProceed = useWizardStore((state) => state.canProceed);
  const hasStoredDataset = useWizardStore((state) => state.hasStoredDataset);
  const detectStoredDataset = useWizardStore((state) => state.detectStoredDataset);
  const recoverLastDataset = useWizardStore((state) => state.recoverLastDataset);
  const dataset = useWizardStore((state) => state.dataset);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    detectStoredDataset();
  }, [detectStoredDataset]);

  // Accesibilidad: al cambiar de paso, el foco va al título de la pantalla.
  useEffect(() => {
    const heading = contentRef.current?.querySelector("h1");
    if (heading === null || heading === undefined) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }, [step]);

  const validation = canProceed(step);
  const isLastStep = step === 3;

  return (
    <AppShell>
      <div className="flex flex-col gap-8 pb-28">
        <Stepper
          steps={STEPS}
          currentIndex={step}
          onStepSelect={(index) => goToStep(index as StepIndex)}
        />

        {step === 0 && dataset === null && hasStoredDataset ? (
          <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">
              Guardamos en este navegador los últimos datos que analizaste.
            </p>
            <Button type="button" variant="outline" onClick={() => recoverLastDataset()}>
              Recuperar último análisis
            </Button>
          </div>
        ) : null}

        <div ref={contentRef}>
          <StepContent step={step} />
        </div>
      </div>

      <div className="border-border bg-background fixed inset-x-0 bottom-0 z-10 border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Button type="button" variant="outline" disabled={step === 0} onClick={() => goBack()}>
              Atrás
            </Button>
            {!isLastStep ? (
              <Button
                type="button"
                disabled={!validation.ok}
                onClick={() => goNext()}
                {...(!validation.ok ? { "aria-describedby": "motivo-continuar" } : {})}
              >
                Continuar
              </Button>
            ) : null}
          </div>
          {!validation.ok && !isLastStep ? (
            <p id="motivo-continuar" role="status" className="text-muted-foreground text-sm">
              {validation.message}
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
