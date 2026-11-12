import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NativeSelect } from "./select";

const items = [
  { value: "temperatura", label: "Temperatura", disabled: false },
  { value: "puntaje", label: "Puntaje", disabled: false },
];

function selectOf(container: HTMLElement): HTMLSelectElement {
  const select = container.querySelector("select");
  if (!select) throw new Error("no se pintó el select");
  return select;
}

describe("NativeSelect", () => {
  it("muestra la opción elegida", () => {
    const { container } = render(
      <NativeSelect value="puntaje" onValueChange={() => {}} items={items} />,
    );
    expect(selectOf(container).value).toBe("puntaje");
  });

  it("queda vacío si el valor guardado ya no está entre las opciones", () => {
    const { container } = render(
      <NativeSelect value="puntaje" onValueChange={() => {}} items={[items[0]!]} />,
    );
    const select = selectOf(container);
    expect(select.value).toBe("");
    expect(select.selectedOptions[0]?.textContent).toBe("");
  });

  it("muestra el placeholder si el valor guardado ya no está entre las opciones", () => {
    const { container } = render(
      <NativeSelect
        value="puntaje"
        onValueChange={() => {}}
        items={[items[0]!]}
        placeholder="Elige una columna"
      />,
    );
    expect(selectOf(container).selectedOptions[0]?.textContent).toBe("Elige una columna");
  });
});
