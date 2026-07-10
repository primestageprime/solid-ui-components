import type { Component } from "solid-js";
import { GapCell } from "../../src/components/Table";
import { BaseTable } from "../../src/components/Table";

export const GapCellShowcase: Component = () => (
  <div class="component-section">
    <h2>GapCell — Composite (Depth 2)</h2>
    <p class="text-meta">
      Remaining-work table cell: count + % + completion bar, severity ramp
      0%→success · ≤50%→warning · &gt;50%→danger. Blank when uncounted.
    </p>
    <div class="example-group">
      <h3>The ramp</h3>
      <table><tbody><tr>
        <td><GapCell remaining={0} total={1000} /></td>
        <td><GapCell remaining={250} total={1000} /></td>
        <td><GapCell remaining={500} total={1000} /></td>
        <td><GapCell remaining={900} total={1000} /></td>
        <td><GapCell remaining={null} total={1000} /></td>
      </tr></tbody></table>
    </div>
  </div>
);
