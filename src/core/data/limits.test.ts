import { describe, expect, it } from "vitest";
import { assertWithinCellLimit, DatasetSizeError, MAX_CELLS } from "./limits";

describe("assertWithinCellLimit", () => {
  it("no lanza cuando está dentro del límite", () => {
    expect(() => assertWithinCellLimit(100, 10)).not.toThrow();
  });

  it("lanza DatasetSizeError con mensaje en español al exceder el límite", () => {
    const rows = MAX_CELLS + 1;
    expect(() => assertWithinCellLimit(rows, 1)).toThrow(DatasetSizeError);
    try {
      assertWithinCellLimit(rows, 1);
    } catch (error) {
      expect(error).toBeInstanceOf(DatasetSizeError);
      expect((error as DatasetSizeError).message).toContain("supera el máximo permitido");
    }
  });
});
