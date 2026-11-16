import type { Dataset } from "@/core/data";
import {
  SCHEMA_VERSION,
  datasetSchema,
  preferencesSchema,
  reportSchema,
  versionedEnvelopeSchema,
  type StoredPreferences,
  type StoredReport,
} from "./schemas";

/** Namespace de todas las claves de localStorage usadas por StatLab. */
const NAMESPACE = "statlab:";
const DATASET_KEY = `${NAMESPACE}dataset`;
const PREFERENCES_KEY = `${NAMESPACE}preferences`;
const REPORT_KEY = `${NAMESPACE}informe`;

function readLocalStorage(key: string): unknown | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Elimina claves con valor `undefined` (compatibilidad con `exactOptionalPropertyTypes`). */
function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function writeLocalStorage(key: string, value: unknown): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda el último dataset trabajado en localStorage, envuelto con su
 * número de versión de esquema.
 */
export function saveLastDataset(dataset: Dataset): boolean {
  return writeLocalStorage(DATASET_KEY, { schemaVersion: SCHEMA_VERSION, payload: dataset });
}

/**
 * Recupera el último dataset guardado. Siempre valida con zod antes de
 * devolverlo; si el contenido está corrupto, no corresponde al esquema
 * vigente, o falla el parseo, devuelve `null` sin lanzar.
 */
export function loadLastDataset(): Dataset | null {
  const raw = readLocalStorage(DATASET_KEY);
  if (raw === null) return null;
  const envelope = versionedEnvelopeSchema(datasetSchema).safeParse(raw);
  if (!envelope.success || envelope.data.schemaVersion !== SCHEMA_VERSION) return null;
  return sanitize(envelope.data.payload) as Dataset;
}

/** Borra el dataset persistido. */
export function clearLastDataset(): void {
  try {
    window.localStorage.removeItem(DATASET_KEY);
  } catch {
    // Sin acceso a localStorage: no hay nada que limpiar.
  }
}

/** Guarda las preferencias de usuario en localStorage. */
export function savePreferences(preferences: StoredPreferences): boolean {
  return writeLocalStorage(PREFERENCES_KEY, {
    schemaVersion: SCHEMA_VERSION,
    payload: preferences,
  });
}

/**
 * Recupera las preferencias de usuario, validadas con zod. Devuelve `null`
 * si no hay nada guardado o el contenido no es válido.
 */
export function loadPreferences(): StoredPreferences | null {
  const raw = readLocalStorage(PREFERENCES_KEY);
  if (raw === null) return null;
  const envelope = versionedEnvelopeSchema(preferencesSchema).safeParse(raw);
  if (!envelope.success || envelope.data.schemaVersion !== SCHEMA_VERSION) return null;
  return sanitize(envelope.data.payload);
}

/**
 * Guarda el informe. Si no cabe (las imágenes pesan), lo guarda sin
 * imágenes y lo dice: el texto y las tablas nunca se pierden por una gráfica.
 *
 * @returns `"completo"`, `"sin-imagenes"` o `"fallo"`.
 */
export function saveReport(report: StoredReport): "completo" | "sin-imagenes" | "fallo" {
  if (writeLocalStorage(REPORT_KEY, { schemaVersion: SCHEMA_VERSION, payload: report })) {
    return "completo";
  }
  const light: StoredReport = {
    ...report,
    items: report.items.map((item) => ({ ...item, images: [] })),
  };
  return writeLocalStorage(REPORT_KEY, { schemaVersion: SCHEMA_VERSION, payload: light })
    ? "sin-imagenes"
    : "fallo";
}

/** Lee el informe guardado, validado; `null` si no hay o no es válido. */
export function loadReport(): StoredReport | null {
  const raw = readLocalStorage(REPORT_KEY);
  if (raw === null) return null;
  const envelope = versionedEnvelopeSchema(reportSchema).safeParse(raw);
  if (!envelope.success || envelope.data.schemaVersion !== SCHEMA_VERSION) return null;
  return sanitize(envelope.data.payload);
}

/** Borra el informe guardado. */
export function clearReport(): void {
  try {
    window.localStorage.removeItem(REPORT_KEY);
  } catch {
    // Sin acceso a localStorage: no hay nada que limpiar.
  }
}
