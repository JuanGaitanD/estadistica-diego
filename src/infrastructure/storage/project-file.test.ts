import { describe, expect, it } from "vitest";

import { buildDataset } from "@/core/data";

import { parseProjectText, projectToBlob } from "./project-file";

describe("archivo de proyecto", () => {
  const dataset = buildDataset([["1"], ["2"]], { source: "texto", headers: ["n"] });
  const report = { title: "Informe", includeSteps: true, items: [] };

  it("guarda y vuelve a abrir datos, informe y configuración", async () => {
    const text = await projectToBlob({ dataset, report, workspace: { x: 1 } }).text();
    const parsed = parseProjectText(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.project.dataset.columns[0]?.values).toEqual([1, 2]);
    expect(parsed.project.report).toEqual(report);
    expect(parsed.project.workspace).toEqual({ x: 1 });
  });

  it("rechaza en llano lo que no es un proyecto o está dañado", () => {
    expect(parseProjectText("no es json")).toEqual({
      ok: false,
      message: "El archivo no es un proyecto de StatLab (no se pudo leer).",
    });
    expect(parseProjectText('{"a":1}')).toEqual({
      ok: false,
      message: "El archivo no es un proyecto de StatLab.",
    });
    expect(parseProjectText('{"app":"statlab","version":1}')).toEqual({
      ok: false,
      message: "El proyecto está dañado o es de otra versión de StatLab.",
    });
  });
});
