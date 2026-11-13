import { afterEach, describe, expect, it, vi } from "vitest";

describe("zod-config", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("crear y usar esquemas no sondea con new Function (sin violación de CSP)", async () => {
    vi.resetModules();
    const sondas = vi.fn();
    const FunctionOriginal = globalThis.Function;
    vi.stubGlobal(
      "Function",
      new Proxy(FunctionOriginal, {
        construct(objetivo, args, nuevo) {
          sondas(...args);
          return Reflect.construct(objetivo, args, nuevo);
        },
      }),
    );

    await import("./zod-config");
    const { importFileOptionsSchema } = await import("@/infrastructure/import/schemas");
    importFileOptionsSchema.safeParse({});

    expect(sondas).not.toHaveBeenCalled();
  });

  it("la validación da el mismo resultado con y sin JIT", async () => {
    vi.resetModules();
    const { z } = await import("zod");
    const esquema = () =>
      z.object({ nombre: z.string().min(2, "corto"), edad: z.number().int().optional() });
    const entradas = [{ nombre: "Ana", edad: 3 }, { nombre: "A" }, { nombre: "Ana", edad: 1.5 }, 7];

    z.config({ jitless: false });
    const conJit = entradas.map((e) => esquema().safeParse(e));
    await import("./zod-config");
    z.config({ jitless: true });
    const sinJit = entradas.map((e) => esquema().safeParse(e));

    expect(sinJit.map((r) => r.success)).toEqual(conJit.map((r) => r.success));
    expect(sinJit.map((r) => (r.success ? r.data : r.error.issues))).toEqual(
      conJit.map((r) => (r.success ? r.data : r.error.issues)),
    );
  });
});
