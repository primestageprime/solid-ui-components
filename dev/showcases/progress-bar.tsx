import type { Component } from "solid-js";
import { StackedProgressBar } from "../../src/components/Progress";
import { ClusterRow, NarrowStack } from "../../src/components/Layout";
import { TextSublabel } from "../../src/components/Text";

export const ProgressBarShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>StackedProgressBar — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (StackedProgressBar.css), no component imports. Multi-segment
        progress bar.
      </p>

      <div class="example-group">
        <h3>Horizontal (default)</h3>
        <NarrowStack>
          <ClusterRow>
            <StackedProgressBar
              segments={[
                { percentage: 30, color: "rgba(255, 204, 0, 0.6)" },
                { percentage: 20, color: "rgba(var(--sui-danger-rgb), 0.7)" },
              ]}
              label={5}
              style={{
                width: "120px",
                height: "20px",
                "font-size": "11px",
                "font-weight": "600",
                color: "var(--sui-text-primary)",
              }}
            />
            <TextSublabel>30% partial + 20% missing</TextSublabel>
          </ClusterRow>
          <ClusterRow>
            <StackedProgressBar
              segments={[
                { percentage: 0, color: "rgba(255, 204, 0, 0.6)" },
                { percentage: 0, color: "rgba(var(--sui-danger-rgb), 0.7)" },
              ]}
              label={0}
              style={{
                width: "120px",
                height: "20px",
                "font-size": "11px",
                color: "var(--sui-text-muted)",
              }}
            />
            <TextSublabel>Empty — no errors</TextSublabel>
          </ClusterRow>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Vertical</h3>
        <div
          style={{ display: "flex", gap: "12px", "align-items": "flex-end" }}
        >
          <StackedProgressBar
            direction="vertical"
            segments={[
              { percentage: 25, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 40, color: "rgba(var(--sui-danger-rgb), 0.7)" },
            ]}
            label={7}
            style={{
              width: "24px",
              height: "80px",
              "font-size": "11px",
              "font-weight": "600",
              color: "var(--sui-text-primary)",
            }}
          />
          <StackedProgressBar
            direction="vertical"
            segments={[
              { percentage: 50, color: "rgba(255, 204, 0, 0.6)" },
              { percentage: 10, color: "rgba(var(--sui-danger-rgb), 0.7)" },
            ]}
            label={3}
            style={{
              width: "24px",
              height: "80px",
              "font-size": "11px",
              "font-weight": "600",
              color: "var(--sui-text-primary)",
            }}
          />
        </div>
      </div>
    </div>
  );
};
