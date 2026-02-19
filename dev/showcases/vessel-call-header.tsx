import { Component } from "solid-js";
import { VesselCallHeader } from "../../src/components/VesselCallHeader";
import { StatusBadge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";

interface Depth3Props {
  onNavigate?: (id: string) => void;
}

export const VesselCallHeaderShowcase: Component<Depth3Props> = (props) => {
  return (
    <div class="component-section">
      <h2>VesselCallHeader — Depth 3</h2>
      <p class="text-meta">Owns CSS (VesselCallHeader.css). Composes DateTimeRange (Depth 2). Vessel name + time range + duration + badge.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <VesselCallHeader
            vesselName="Project Alpha"
            connectedAt="2026-02-13T08:30:00Z"
            disconnectedAt="2026-02-13T14:15:00Z"
            badge={<StatusBadge variant="info">ACTIVE</StatusBadge>}
            action={<Button variant="primary" size="sm">View</Button>}
          />
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Title</div>
            <h2 style={{ margin: "0", "font-size": "1.25rem", "font-weight": "700" }}>Project Alpha</h2>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("status-badge")}
          >
            <div class="depth2-atom__label">StatusBadge</div>
            <StatusBadge variant="info">ACTIVE</StatusBadge>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("button")}
          >
            <div class="depth2-atom__label">Button</div>
            <Button variant="primary" size="sm">View</Button>
          </div>
          <h3>Depth 2</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("date-time-range")}
          >
            <div class="depth2-atom__label">DateTimeRange</div>
            <span style={{ "font-size": "0.875rem", color: "var(--jtf-text-secondary)" }}>
              2026-02-13 08:30 — 14:15
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
