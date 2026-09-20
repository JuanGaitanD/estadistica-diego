"use client";

/** Paso 2: "¿Qué tipo de variables son?" (RF-06). */
import { ArrowDown, ArrowUp } from "lucide-react";

import { StepHeader } from "@/components/layout/step-header";
import { HelpHint } from "@/components/shared/help-hint";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VariableKind } from "@/core/data";

import { useWizardStore } from "../store/wizard-store";

const KIND_LABEL: Readonly<Record<VariableKind, string>> = {
  nominal: "Cualitativa nominal",
  ordinal: "Cualitativa ordinal",
  discreta: "Cuantitativa discreta",
  continua: "Cuantitativa continua",
};

const KIND_HELP: Readonly<Record<VariableKind, string>> = {
  nominal: "Categorías sin un orden natural, por ejemplo la ciudad o el color favorito.",
  ordinal: "Categorías con un orden que tú declaras, por ejemplo bajo, medio y alto.",
  discreta: "Cantidades que se cuentan con números enteros, por ejemplo el número de hijos.",
  continua: "Cantidades que se miden y admiten decimales, por ejemplo la estatura o la nota.",
};

const KINDS: readonly VariableKind[] = ["nominal", "ordinal", "discreta", "continua"];

export function StepVariables() {
  const columns = useWizardStore((state) => state.columns);
  const renameColumn = useWizardStore((state) => state.renameColumn);
  const setColumnKind = useWizardStore((state) => state.setColumnKind);
  const toggleColumn = useWizardStore((state) => state.toggleColumn);
  const moveCategory = useWizardStore((state) => state.moveCategory);

  return (
    <div className="gap-block flex flex-col">
      <StepHeader
        eyebrow="Paso 2 · Variables"
        title="¿Qué tipo de variables son?"
        subtitle="Ya adivinamos algunas; solo confirma o corrige lo que haga falta."
      />

      {columns.map((column) => (
        <SectionCard key={column.id} title={column.name}>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`nombre-${column.id}`}>Nombre de la columna</Label>
                <Input
                  id={`nombre-${column.id}`}
                  value={column.name}
                  onChange={(event) => renameColumn(column.id, event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`tipo-${column.id}`}>Tipo de variable</Label>
                  <HelpHint
                    label={KINDS.map((kind) => `${KIND_LABEL[kind]}: ${KIND_HELP[kind]}`).join(" ")}
                  />
                </div>
                <Select
                  value={column.kind}
                  onValueChange={(value) => setColumnKind(column.id, value as VariableKind)}
                >
                  <SelectTrigger id={`tipo-${column.id}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {KIND_LABEL[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm">
                  <Badge variant="secondary" className="mr-2">
                    Sugerido: {KIND_LABEL[column.inferredKind]}
                  </Badge>
                  {column.inferredReason}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id={`incluir-${column.id}`}
                checked={column.include}
                onCheckedChange={(checked) => toggleColumn(column.id, checked === true)}
              />
              <Label htmlFor={`incluir-${column.id}`} className="text-base">
                Incluir en el análisis
              </Label>
            </div>

            {column.kind === "ordinal" ? (
              <div className="flex flex-col gap-2">
                <p className="text-foreground text-sm font-medium">
                  Orden de las categorías, de menor a mayor
                </p>
                <ul className="flex flex-col gap-2">
                  {column.categoryOrder.map((category, index) => (
                    <li
                      key={category}
                      className="border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <span className="text-sm">
                        {index + 1}. {category}
                      </span>
                      <span className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={index === 0}
                          aria-label={`Subir ${category}`}
                          onClick={() => moveCategory(column.id, index, -1)}
                        >
                          <ArrowUp className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={index === column.categoryOrder.length - 1}
                          aria-label={`Bajar ${category}`}
                          onClick={() => moveCategory(column.id, index, 1)}
                        >
                          <ArrowDown className="size-4" aria-hidden="true" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
