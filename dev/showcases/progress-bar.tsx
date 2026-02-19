import { Component } from "solid-js";
import { StackedProgressBar } from "../../src/components/Progress";

export const ProgressBarShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>StackedProgressBar — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (StackedProgressBar.css), no component imports. Multi-segment progress bar.</p>

      <div class="example-group">
        <h3>Horizontal (default)</h3>
        <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
          <StackedProgressBar
            segments={[
              { percentage: 30, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 20, color: "rgba(255, 0, 64, 0.7)" },
            ]}
            label={5}
            style={{ width: "120px", height: "20px", "font-size": "11px", "font-weight": "600", color: "var(--jtf-text-primary)" }}
          />
          <span style={{ color: "var(--jtf-text-muted)", "font-size": "12px" }}>30% partial + 20% missing</span>
        </div>
        <div style={{ display: "flex", gap: "8px", "align-items": "center", "margin-top": "8px" }}>
          <StackedProgressBar
            segments={[
              { percentage: 0, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 0, color: "rgba(255, 0, 64, 0.7)" },
            ]}
            label={0}
            style={{ width: "120px", height: "20px", "font-size": "11px", color: "var(--jtf-text-muted)" }}
          />
          <span style={{ color: "var(--jtf-text-muted)", "font-size": "12px" }}>Empty — no errors</span>
        </div>
      </div>

      <div class="example-group">
        <h3>Vertical</h3>
        <div style={{ display: "flex", gap: "12px", "align-items": "flex-end" }}>
          <StackedProgressBar
            direction="vertical"
            segments={[
              { percentage: 25, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 40, color: "rgba(255, 0, 64, 0.7)" },
            ]}
            label={7}
            style={{ width: "24px", height: "80px", "font-size": "11px", "font-weight": "600", color: "var(--jtf-text-primary)" }}
          />
          <StackedProgressBar
            direction="vertical"
            segments={[
              { percentage: 50, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 10, color: "rgba(255, 0, 64, 0.7)" },
            ]}
            label={3}
            style={{ width: "24px", height: "80px", "font-size": "11px", "font-weight": "600", color: "var(--jtf-text-primary)" }}
          />
        </div>
      </div>
    </div>
  );
};
