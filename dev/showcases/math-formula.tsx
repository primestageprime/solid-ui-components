import type { Component } from "solid-js";
import { MathFormula } from "../../src/components/MathFormula";
import { Stack } from "../../src/components/Layout/Stack";

export const MathFormulaShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>MathFormula — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (MathFormula.css), no component imports. KaTeX renderer with
        interactive variable highlighting.
      </p>

      <div class="example-group">
        <h3>Base Component</h3>
        <Stack gap="sm">
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
            <MathFormula
              latex={
                "(1 - CE) \\times 13.8 + \\frac{NOx \\times F_2 \\times 2760}{836200 \\times kW}"
              }
            />
          </div>
          <div>
            <div class="text-meta">Inline mode (displayMode: false)</div>
            <p class="math-formula-demo__prose">
              The result is{" "}
              <MathFormula
                latex={"x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"}
                displayMode={false}
                class="math-formula-demo__inline"
              />{" "}
              for all values.
            </p>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Wrapping variant (wrap)</h3>
        <p class="text-meta">
          Opt-in <code>wrap</code> splits the formula at top-level{" "}
          <code>+</code>/<code>=</code> operators and renders each term as its
          own inline KaTeX element in a flex-wrap row. Wide: one line. Narrow:
          it wraps to multiple lines at operator boundaries (no shrinking, no
          horizontal scroll). Drag the panes to compare.
        </p>
        <Stack gap="sm">
          <div>
            <div class="text-meta">Wide container — fits on one line</div>
            <div class="math-formula-demo__wide">
              <MathFormula
                wrap
                latex={
                  "(1 - CE) \\times 13.8 + \\frac{NOx \\times F_2 \\times 2760}{836200 \\times kW} + \\frac{0.1029 \\times A}{kW} = 1.2345"
                }
              />
            </div>
          </div>
          <div>
            <div class="text-meta">
              Narrow container (320px) — wraps at + / = boundaries
            </div>
            <div class="math-formula-demo__narrow">
              <MathFormula
                wrap
                latex={
                  "(1 - CE) \\times 13.8 + \\frac{NOx \\times F_2 \\times 2760}{836200 \\times kW} + \\frac{0.1029 \\times A}{kW} = 1.2345"
                }
              />
            </div>
          </div>
          <div>
            <div class="text-meta">
              Narrow WITHOUT wrap (default) — single block, scrolls
            </div>
            <div class="math-formula-demo__narrow">
              <MathFormula
                latex={
                  "(1 - CE) \\times 13.8 + \\frac{NOx \\times F_2 \\times 2760}{836200 \\times kW} + \\frac{0.1029 \\times A}{kW} = 1.2345"
                }
              />
            </div>
          </div>
        </Stack>
      </div>
    </div>
  );
};
