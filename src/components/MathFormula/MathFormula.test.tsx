import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { MathFormula } from "./MathFormula";

const NOX =
  "(1 - \\var{ce}{CE}) \\times 13.8 + \\frac{\\var{nox}{NOx} \\times \\var{f2}{F_2} \\times 2760}{836200 \\times \\var{kw}{kW}} + \\frac{0.1029 \\times \\var{amps}{A}}{\\var{kw}{kW}} = \\var{result}{1.2345}";

describe("MathFormula", () => {
  it("default render is a single KaTeX block (no wrap row)", () => {
    const { container } = render(() => <MathFormula latex={NOX} />);
    const root = container.querySelector(".math-formula")!;
    expect(root.classList.contains("math-formula--wrap")).toBe(false);
    expect(root.querySelector(".math-formula-row")).toBeNull();
    expect(root.querySelector(".katex-display")).not.toBeNull();
  });

  it("wrap render splits into a flex row of terms + operators", () => {
    const { container } = render(() => <MathFormula wrap latex={NOX} />);
    const root = container.querySelector(".math-formula")!;
    expect(root.classList.contains("math-formula--wrap")).toBe(true);
    const row = root.querySelector(".math-formula-row");
    expect(row).not.toBeNull();
    // 4 terms + 3 operators (+, +, =)
    expect(row!.querySelectorAll(".math-formula-term").length).toBe(4);
    expect(row!.querySelectorAll(".math-formula-op").length).toBe(3);
  });

  it("wrap still preserves hoverable \\var elements for highlighting", () => {
    const { container } = render(() => <MathFormula wrap latex={NOX} />);
    const root = container.querySelector(".math-formula")!;
    expect(root.querySelectorAll(".formula-var").length).toBeGreaterThan(0);
  });

  it("wrap with no top-level operator falls back to a single block", () => {
    const { container } = render(() => (
      <MathFormula wrap latex={"\\frac{a}{b}"} />
    ));
    const root = container.querySelector(".math-formula")!;
    expect(root.classList.contains("math-formula--wrap")).toBe(false);
    expect(root.querySelector(".math-formula-row")).toBeNull();
  });
});
