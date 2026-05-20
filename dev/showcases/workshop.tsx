import { Component } from "solid-js";
import { SwimlaneChartShowcase } from "./swimlane-chart";

/**
 * Workshop — single-route scratchpad for whatever component is being worked
 * on right now. Re-points to the active showcase as work moves. When a piece
 * is "finished", promote it to its own showcase entry and update this file
 * to point at the next thing.
 *
 * Current focus: SwimlaneChart.
 */
export const WorkshopShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Workshop</h2>
      <p class="text-meta">
        Live focus area. Currently pointing at <strong>SwimlaneChart</strong>.
      </p>
      <SwimlaneChartShowcase />
    </div>
  );
};
