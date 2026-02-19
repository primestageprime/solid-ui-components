import { Component, For } from "solid-js";
import { ProgressCard, ProgressStep } from "../../src/components/ProgressCard";
import { CacheProgressCard } from "../../src/components/ProgressCard/variants";
import { Icon } from "../../src/components/Icon";
import type { IconName } from "../../src/components/Icon";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

const CACHE_ICONS: { name: IconName; label: string }[] = [
  { name: "cache-minutes", label: "Minutes" },
  { name: "cache-hours", label: "Hours" },
  { name: "cache-stats", label: "Stats" },
  { name: "cache-coverage", label: "Coverage" },
  { name: "cache-calc", label: "Calcs" },
];

export const ProgressCardShowcase: Component<Depth2Props> = (props) => {
  const activeSteps: ProgressStep[] = [
    { id: "upload", label: "Upload", status: "completed" },
    { id: "validate", label: "Validate", status: "completed" },
    { id: "process", label: "Process", status: "active" },
    { id: "complete", label: "Complete", status: "pending" },
  ];

  const errorSteps: ProgressStep[] = [
    { id: "upload", label: "Upload", status: "completed" },
    { id: "validate", label: "Validate", status: "error" },
    { id: "process", label: "Process", status: "pending" },
    { id: "complete", label: "Complete", status: "pending" },
  ];

  const doneSteps: ProgressStep[] = [
    { id: "upload", label: "Upload", status: "completed" },
    { id: "validate", label: "Validate", status: "completed" },
    { id: "process", label: "Process", status: "completed" },
    { id: "complete", label: "Complete", status: "completed" },
  ];

  return (
    <div class="component-section">
      <h2>ProgressCard — Depth 2</h2>
      <p class="text-meta">Owns CSS (ProgressCard.css). Composes Icon (Atomic/Depth 1) via ICON_PATHS in variants. Step icons with title, subtitle, message.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — In Progress</h3>
          <ProgressCard
            title="Data Import"
            subtitle="Step 3 of 4"
            steps={activeSteps}
            message="Processing vessel records..."
          />

          <h3 style={{ "margin-top": "24px" }}>Composed — Error State</h3>
          <ProgressCard
            title="Data Import"
            subtitle="Validation Failed"
            steps={errorSteps}
            message="Invalid format in row 42."
          />

          <h3 style={{ "margin-top": "24px" }}>Composed — Complete</h3>
          <ProgressCard
            title="Data Import"
            subtitle="All steps complete"
            steps={doneSteps}
            message="Import successful."
          />

          <h3 style={{ "margin-top": "24px" }}>CacheProgressCard — Active at minute_level</h3>
          <CacheProgressCard
            title="Shanghai Highway"
            subtitle="a1b2c3"
            currentStep="minute_level"
            status="fetching"
            message="Fetching minute-level data..."
          />

          <h3 style={{ "margin-top": "24px" }}>CacheProgressCard — Active at statistics</h3>
          <CacheProgressCard
            title="Cape Cosmos"
            subtitle="d4e5f6"
            currentStep="statistics"
            status="caching"
            message="Computing statistics..."
          />

          <h3 style={{ "margin-top": "24px" }}>CacheProgressCard — Completed</h3>
          <CacheProgressCard
            title="Grand Aurora"
            subtitle="g7h8i9"
            currentStep="calculations"
            status="completed"
            message="Cache complete."
          />

          <h3 style={{ "margin-top": "24px" }}>CacheProgressCard — Error at hour_level</h3>
          <CacheProgressCard
            title="Pacific Voyager"
            subtitle="j0k1l2"
            currentStep="hour_level"
            status="error"
            message="Timeout fetching hour-level data."
          />
        </div>
        <div class="depth2-atoms">
          <h3>Atoms Used</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Icon — Cache Stage Icons</div>
            <For each={CACHE_ICONS}>
              {(icon) => (
                <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("icon")}>
                  <div class="depth2-atom__label">{icon.name}</div>
                  <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                    <Icon name={icon.name} variant="outline" size="lg" />
                    <Icon name={icon.name} variant="solid" size="lg" />
                    <span class="text-meta">{icon.label}</span>
                  </div>
                </div>
              )}
            </For>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Icon — Default Step Icons</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("icon")}>
              <div class="depth2-atom__label">Built-in SVG</div>
              <div class="text-meta">pending (circle), active (spinner), completed (check), error (cross)</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">ProgressCard CSS</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Card shell</div>
              <div class="text-meta">jtf-progress-card — container with header, steps, message</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Step circle</div>
              <div class="text-meta">background fill + spinner ring + icon overlay</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Connector</div>
              <div class="text-meta">arrow between steps, colored when previous step completed</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Factories</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">createProgressCard</div>
              <div class="text-meta">Merge default props into ProgressCard</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">createWorkflowProgressCard</div>
              <div class="text-meta">currentStep + status → derived step statuses</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
