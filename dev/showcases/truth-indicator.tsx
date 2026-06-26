import { Component, createSignal } from "solid-js";
import { TruthIndicator, createTruthIndicator } from "../../src/components/TruthIndicator";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";

const SmallTruth = createTruthIndicator({ size: "sm" });
const LargeTruth = createTruthIndicator({ size: "lg" });

export const TruthIndicatorShowcase: Component = () => {
  const [v, setV] = createSignal(true);
  return (
    <div class="component-section">
      <h2>TruthIndicator — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS, no component imports. Green check for <code>true</code>, red
        prohibition (circle + slash) for <code>false</code>.
      </p>

      <div class="example-group">
        <h3>States</h3>
        <Row gap="sm" align="center">
          <Stack gap="xs" align="center"><TruthIndicator value={true} /><span class="text-meta">value=true</span></Stack>
          <Stack gap="xs" align="center"><TruthIndicator value={false} /><span class="text-meta">value=false</span></Stack>
        </Row>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <Row gap="sm" align="center">
          <Stack gap="xs" align="center"><SmallTruth value={true} /><span class="text-meta">sm (12px)</span></Stack>
          <Stack gap="xs" align="center"><TruthIndicator value={true} /><span class="text-meta">md (16px, default)</span></Stack>
          <Stack gap="xs" align="center"><LargeTruth value={true} /><span class="text-meta">lg (22px)</span></Stack>
        </Row>
      </div>

      <div class="example-group">
        <h3>Interactive (click to toggle)</h3>
        <Row gap="sm" align="center">
          <TruthIndicator value={v()} size="lg" onClick={() => setV((x) => !x)} />
          <span class="text-meta">click the indicator — current: <strong>{String(v())}</strong></span>
        </Row>
      </div>
    </div>
  );
};
