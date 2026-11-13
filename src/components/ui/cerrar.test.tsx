import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

describe("botón de cerrar", () => {
  it("el diálogo lo nombra «Cerrar», no «Close»", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Descripción</DialogDescription>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getAllByRole("button", { name: "Cerrar" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("la hoja lo nombra «Cerrar», no «Close»", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Título</SheetTitle>
          <SheetDescription>Descripción</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});
