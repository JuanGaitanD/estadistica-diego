"use client";

import { create } from "zustand";

import {
  clearReport,
  loadReport,
  saveReport,
  type StoredReport,
  type StoredReportItem,
} from "@/infrastructure/storage";

/** Lo que aporta quien añade un resultado; id, fecha y nota los pone el informe. */
export type ReportItemInput = Omit<StoredReportItem, "id" | "addedAt" | "note">;

export const DEFAULT_REPORT_TITLE = "Informe de StatLab";

export interface ReportState extends StoredReport {
  /** Aviso si el navegador no pudo guardar todo (por ejemplo, sin imágenes). */
  readonly storageWarning: string | null;
}

export interface ReportActions {
  /** Carga el informe guardado en este navegador, si hay. */
  hydrate: () => void;
  add: (input: ReportItemInput) => string;
  remove: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  setNote: (id: string, note: string) => void;
  setTitle: (title: string) => void;
  setIncludeSteps: (include: boolean) => void;
  /** Reemplaza el informe entero (al abrir un proyecto). */
  replace: (report: StoredReport) => void;
  clear: () => void;
}

const EMPTY: ReportState = {
  title: DEFAULT_REPORT_TITLE,
  includeSteps: false,
  items: [],
  storageWarning: null,
};

function snapshot(state: ReportState): StoredReport {
  return { title: state.title, includeSteps: state.includeSteps, items: state.items };
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Informe acumulativo (RF-43): cada resultado se añade como copia fija de lo
 * que se veía, se ordena y se exporta junto. Se guarda en este navegador
 * después de cada cambio.
 */
export const useReportStore = create<ReportState & ReportActions>()((set, get) => {
  const commit = (patch: Partial<StoredReport>): void => {
    const next = { ...get(), ...patch };
    const saved = saveReport(snapshot(next));
    set({
      ...patch,
      storageWarning:
        saved === "completo"
          ? null
          : saved === "sin-imagenes"
            ? "El navegador no tiene espacio para guardar las gráficas del informe: si recargas la página se conservará el texto y las tablas, pero no las imágenes. Guarda el proyecto en un archivo para no perderlas."
            : "El navegador no permitió guardar el informe: si recargas la página se perderá. Guarda el proyecto en un archivo.",
    });
  };

  return {
    ...EMPTY,

    hydrate: () => {
      const stored = loadReport();
      if (stored !== null) set({ ...stored, storageWarning: null });
    },

    add: (input) => {
      const item: StoredReportItem = {
        ...input,
        id: newId(),
        addedAt: new Date().toISOString(),
        note: "",
      };
      commit({ items: [...get().items, item] });
      return item.id;
    },

    remove: (id) => commit({ items: get().items.filter((item) => item.id !== id) }),

    move: (id, direction) => {
      const items = [...get().items];
      const index = items.findIndex((item) => item.id === id);
      const target = index + direction;
      const current = items[index];
      const other = items[target];
      if (current === undefined || other === undefined) return;
      items[index] = other;
      items[target] = current;
      commit({ items });
    },

    setNote: (id, note) =>
      commit({ items: get().items.map((item) => (item.id === id ? { ...item, note } : item)) }),

    setTitle: (title) => commit({ title }),

    setIncludeSteps: (includeSteps) => commit({ includeSteps }),

    replace: (report) => commit(report),

    clear: () => {
      clearReport();
      set({ ...EMPTY });
    },
  };
});
