import type { Component } from "solid-js";
import { TitledTimeRangeHeader } from "../../src/components/TitledTimeRangeHeader";
import { StatusBadge } from "../../src/components/Badge/StatusBadge";
import { Button } from "../../src/components/Button/Button";

export const TitledTimeRangeHeaderShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>TitledTimeRangeHeader — Primitive (Depth 0)</h2>
      <p class="text-meta">Owns CSS (TitledTimeRangeHeader.css); no library-component imports. The pure `formatDateTimeRange` helper supplies the date-range string. Title + optional badge + time range + duration + optional asset chip + optional action slot.</p>

      <h3>Active session</h3>
      <TitledTimeRangeHeader
        title="Project Alpha"
        start="2026-02-13T08:30:00Z"
        end="2026-02-13T14:15:00Z"
        badge={<StatusBadge variant="info">ACTIVE</StatusBadge>}
        action={<Button variant="primary" size="sm">View</Button>}
      />

      <h3 style={{ "margin-top": "24px" }}>Ongoing (no end)</h3>
      <TitledTimeRangeHeader
        title="Project Beta"
        start="2026-02-13T08:30:00Z"
        action={<Button variant="primary" size="sm">View</Button>}
      />

      <h3 style={{ "margin-top": "24px" }}>With asset label + link href</h3>
      <TitledTimeRangeHeader
        title="Project Gamma"
        start="2026-02-10T12:00:00Z"
        end="2026-02-13T18:30:00Z"
        assetLabel="AST-4421"
        href="#"
      />
    </div>
  );
};
