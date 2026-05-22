import { Component } from "solid-js";
import { VesselCallHeader } from "../../src/components/VesselCallHeader";
import { StatusBadge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";

export const VesselCallHeaderShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>VesselCallHeader — Atomic Primitive (Depth 1)</h2>
      <p class="text-meta">Owns CSS (VesselCallHeader.css); no library-component imports. The pure `formatDateTimeRange` helper supplies the date-range string. Title + optional badge + time range + duration + optional asset chip + optional action slot.</p>

      <h3>Active call</h3>
      <VesselCallHeader
        vesselName="Project Alpha"
        connectedAt="2026-02-13T08:30:00Z"
        disconnectedAt="2026-02-13T14:15:00Z"
        badge={<StatusBadge variant="info">ACTIVE</StatusBadge>}
        action={<Button variant="primary" size="sm">View</Button>}
      />

      <h3 style={{ "margin-top": "24px" }}>Ongoing (no disconnectedAt)</h3>
      <VesselCallHeader
        vesselName="Project Beta"
        connectedAt="2026-02-13T08:30:00Z"
        action={<Button variant="primary" size="sm">View</Button>}
      />

      <h3 style={{ "margin-top": "24px" }}>With asset ID + link href</h3>
      <VesselCallHeader
        vesselName="Project Gamma"
        connectedAt="2026-02-10T12:00:00Z"
        disconnectedAt="2026-02-13T18:30:00Z"
        assetId="AST-4421"
        href="#"
      />
    </div>
  );
};
