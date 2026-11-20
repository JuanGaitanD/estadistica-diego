"use client";

import { useId, useState, type FormEvent } from "react";

import { parseLocaleNumber } from "@/core/data";
import { locateValue, type LocatedValue } from "@/core/statistics";
import { InterpretationPanel } from "@/components/shared/interpretation-panel";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanNumberText } from "@/components/shared/form-fields";

export interface ValueLocatorProps {
  variableName: string;
  /** Datos válidos ordenados de la variable. */
  sortedValues: readonly number[];
}

/**
 * «¿Dónde queda un valor?» (M1): la persona escribe un número y StatLab dice
 * su percentil, cuántos datos quedan por debajo y su puntaje z, con el
 * cálculo plegado.
 */
export function ValueLocator({ variableName, sortedValues }: ValueLocatorProps) {
  const inputId = useId();
  const errorId = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [located, setLocated] = useState<LocatedValue | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = parseLocaleNumber(text, undefined, ",").value;
    if (value === null) {
      setError("Escribe un número, por ejemplo 4,5.");
      setLocated(null);
      return;
    }
    const result = locateValue(sortedValues, value);
    if (result === null) {
      setError("Con estos datos no se puede ubicar un valor: todos son iguales.");
      setLocated(null);
      return;
    }
    setError(null);
    setLocated(result);
  };

  return (
    <SectionCard
      title="¿Dónde queda un valor?"
      description={`Escribe un valor de ${variableName} y mira qué parte de los datos queda por debajo.`}
    >
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={inputId}>Valor</Label>
          <Input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Por ejemplo, 4,5"
            className="w-44"
            value={text}
            onChange={(event) => setText(cleanNumberText(event.target.value))}
            aria-invalid={error !== null}
            {...(error !== null ? { "aria-describedby": errorId } : {})}
          />
        </div>
        <Button type="submit" variant="outline">
          Ubicar
        </Button>
      </form>
      {error !== null ? (
        <p id={errorId} role="alert" className="text-destructive mt-2 text-sm font-semibold">
          {error}
        </p>
      ) : null}
      {located !== null ? (
        <InterpretationPanel
          className="mt-5"
          title="Dónde queda"
          name={`${variableName}, ${text}`}
          interpretation={located.interpretation}
          steps={located.steps}
        />
      ) : null}
    </SectionCard>
  );
}
