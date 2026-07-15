import type { Component } from "solid-js";
import { StatusBadge } from "../../src/components/Badge/StatusBadge";
import { ResultDisplay } from "../../src/components/DataDisplay";
import { NarrowStack } from "../../src/components/Layout";

export const ResultDisplayShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ResultDisplay — Composed (Depth 2)</h2>
      <p class="text-meta">
        Owns CSS (ResultDisplay.css); no library-component imports. Header
        (label + sublabel) over a value+units row with optional badge slot.
        Data-driven `valueColor` flows as inline style on the value span
        (allowed inside a Primitive).
      </p>

      <h3>Pass case</h3>
      <ResultDisplay
        label="Performance Score"
        sublabel="Target: 85 pts"
        value="92.4"
        units="pts"
        badge={<StatusBadge variant="compliant">PASSING</StatusBadge>}
      />

      <h3 style={{ "margin-top": "24px" }}>
        Violation (data-driven `valueColor`)
      </h3>
      <ResultDisplay
        label="NOx Emissions"
        sublabel="Threshold: 3.5 g/kWh"
        value="4.12"
        units="g/kWh"
        valueColor="var(--sui-danger)"
        badge={<StatusBadge variant="violation">VIOLATION</StatusBadge>}
      />

      <h3 style={{ "margin-top": "24px" }}>No units</h3>
      <ResultDisplay label="Count" value={42} />

      <h3 style={{ "margin-top": "24px" }}>
        Highlightable + highlighted (FormulaDecomposition affordance)
      </h3>
      <p class="text-meta">
        The `highlightable` prop opts into the hover-target chrome (cursor,
        padding, transition). `highlighted` paints the active tint. Used by
        `createFormulaResult` to coordinate hover between a formula variable and
        its result row.
      </p>
      <NarrowStack>
        <ResultDisplay
          label="Highlightable (hover-affordance only)"
          value="0.123"
          units="g/kWh"
          highlightable
        />
        <ResultDisplay
          label="Highlighted (active tint)"
          value="0.123"
          units="g/kWh"
          highlightable
          highlighted
        />
      </NarrowStack>
    </div>
  );
};
