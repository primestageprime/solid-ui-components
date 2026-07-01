import type { Component } from "solid-js";
import { BurndownChart } from "../../src/components/BurndownChart";

export const BurndownChartShowcase: Component = () => {
  const bars = [
    { label: "Mon", planned_complete: 0,  planned_incomplete: 30, unplanned_complete: 0, unplanned_incomplete: 0 },
    { label: "Tue", planned_complete: 4,  planned_incomplete: 26, unplanned_complete: 0, unplanned_incomplete: 2 },
    { label: "Wed", planned_complete: 8,  planned_incomplete: 22, unplanned_complete: 1, unplanned_incomplete: 0 },
    { label: "Thu", planned_complete: 13, planned_incomplete: 17, unplanned_complete: 0, unplanned_incomplete: 1 },
    { label: "Fri", planned_complete: 18, planned_incomplete: 12, unplanned_complete: 2, unplanned_incomplete: 3 },
    { label: "Mon", planned_complete: 21, planned_incomplete: 9,  unplanned_complete: 0, unplanned_incomplete: 0 },
    { label: "Tue", planned_complete: 25, planned_incomplete: 5,  unplanned_complete: 1, unplanned_incomplete: 1 },
  ];
  return (
    <div class="component-section">
      <h2>BurndownChart — Composed (Depth 1)</h2>
      <p class="text-meta">
        Stacked bars above (planned) + below (unplanned) the zero axis, with
        a trend line + projected close. Now composes <code>Chart</code> +
        <code>BarSeries</code> + <code>LineSeries</code> internally.
      </p>
      <div class="example-group">
        <BurndownChart bars={bars} onSegmentClick={(i, seg) => console.log("clicked", i, seg)} />
      </div>
    </div>
  );
};
