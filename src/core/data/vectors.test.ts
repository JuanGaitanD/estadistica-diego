import { describe, expect, it } from "vitest";
import { toCategoricalVector, toNumericVector } from "./vectors";
import type { Column, Variable } from "./types";

function column(values: Column["values"]): Column {
  const variable: Variable = {
    id: "v",
    name: "v",
    kind: "discreta",
    kindInferred: "discreta",
    kindConfirmedByUser: false,
  };
  return { variable, values, missingCount: values.filter((v) => v === null).length };
}

describe("toNumericVector", () => {
  it("filtra nulos y valores no numéricos", () => {
    expect(toNumericVector(column([1, null, 2, "x", 3]))).toEqual([1, 2, 3]);
  });
});

describe("toCategoricalVector", () => {
  it("filtra nulos y convierte números a texto", () => {
    expect(toCategoricalVector(column(["a", null, "b", 1]))).toEqual(["a", "b", "1"]);
  });
});
