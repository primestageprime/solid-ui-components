import { Component } from "solid-js";
import { MathFormula } from "../../src/components/MathFormula";
import { Stack } from "../../src/components/Layout";

export const MathFormulaShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>MathFormula — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (MathFormula.css), no component imports. KaTeX renderer with interactive variable highlighting.</p>

      <div class="example-group">
        <h3>Base Component</h3>
        <Stack gap="md">
          <div>
            <div class="text-meta">Simple expression (display mode)</div>
            <MathFormula latex="E = mc^2" />
          </div>
          <div>
            <div class="text-meta">Fraction</div>
            <MathFormula latex={"\\frac{a^2 + b^2}{c}"} />
          </div>
          <div>
            <div class="text-meta">Complex formula with operators</div>
            <MathFormula latex={"(1 - CE) \\times 13.8 + \\frac{NOx \\times F_2 \\times 2760}{836200 \\times kW}"} />
          </div>
          <div>
            <div class="text-meta">Inline mode (displayMode: false)</div>
            <p style={{ color: "var(--text-secondary)" }}>
              The result is <MathFormula latex={"x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"} displayMode={false} style={{ display: "inline-block" }} /> for all values.
            </p>
          </div>
        </Stack>
      </div>

    </div>
  );
};
