import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { FormulaCaption, createFormulaCaption } from "./FormulaCaption";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

describe("FormulaCaption", () => {
  it("shows its work", () => {
    const { container } = render(() => (
      <FormulaCaption
        operand={8}
        factor={125}
        formatFactor={money}
        formatResult={money}
      />
    ));
    expect(container.textContent).toBe("× $125 = $1,000");
  });

  it("keeps its line, blank, when there is nothing to say", () => {
    const { container } = render(() => (
      <FormulaCaption operand={null} factor={125} />
    ));
    expect(container.textContent).toBe(" ");
  });

  it("takes its formatting from the factory, and only numbers at the call site", () => {
    const Cost = createFormulaCaption({
      formatFactor: money,
      formatResult: money,
    });
    const { container } = render(() => <Cost operand={16} factor={125} />);
    expect(container.textContent).toBe("× $125 = $2,000");
  });
});
