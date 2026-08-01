import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { createFormulaResult, type FormulaConfig } from "./FormulaDecomposition";

const baseConfig: FormulaConfig = {
  label: "Test Result",
  resultUnits: "g/kWh",
  vars: [],
  threshold: 10,
  compute: () => 5.00347,
  latex: (resultStr) => `\\var{result}{${resultStr}}`,
};

describe("FormulaDecomposition — createFormulaResult", () => {
  it("defaults to toFixed(resultPrecision) when resultSigFigs is unset", () => {
    const Result = createFormulaResult(baseConfig);
    const { container } = render(() => <Result values={{}} />);
    expect(container.textContent).toContain("5.0035");
  });

  it("respects an explicit resultPrecision when resultSigFigs is unset", () => {
    const Result = createFormulaResult({ ...baseConfig, resultPrecision: 2 });
    const { container } = render(() => <Result values={{}} />);
    expect(container.textContent).toContain("5.00");
  });

  it("formats to significant figures when resultSigFigs is set", () => {
    const Result = createFormulaResult({ ...baseConfig, resultSigFigs: 4 });
    const { container } = render(() => <Result values={{}} />);
    expect(container.textContent).toContain("5.003");
    expect(container.textContent).not.toContain("5.0035");
  });
});
