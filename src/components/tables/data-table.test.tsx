import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { DataTable, type DataTableColumn } from "@/components/tables/data-table";

interface Row {
  categoria: string;
  frecuencia: number;
}

const columns: DataTableColumn<Row>[] = [
  { key: "categoria", label: "Categoría" },
  { key: "frecuencia", label: "Frecuencia", align: "right" },
];

const rows: Row[] = [
  { categoria: "A", frecuencia: 10 },
  { categoria: "B", frecuencia: 20 },
];

describe("DataTable", () => {
  it("renderiza cabecera, filas y caption accesible", () => {
    render(<DataTable columns={columns} rows={rows} caption="Tabla de ejemplo" />);
    expect(screen.getByText("Categoría")).toBeInTheDocument();
    expect(screen.getByText("Frecuencia")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Tabla de ejemplo")).toBeInTheDocument();
  });

  it("aplica formato personalizado por columna", () => {
    const formattedColumns: DataTableColumn<Row>[] = [
      { key: "categoria", label: "Categoría" },
      {
        key: "frecuencia",
        label: "Frecuencia",
        align: "right",
        format: (row) => `${row.frecuencia} unidades`,
      },
    ];
    render(<DataTable columns={formattedColumns} rows={rows} />);
    expect(screen.getByText("10 unidades")).toBeInTheDocument();
  });

  it("aplica getCellClassName para resaltar celdas (p. ej. máximos)", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getCellClassName={(row, column) =>
          column.key === "frecuencia" && row.frecuencia === 20 ? "bg-heat-5" : undefined
        }
      />,
    );
    const highlighted = screen.getByText("20");
    expect(highlighted).toHaveClass("bg-heat-5");
  });
});
