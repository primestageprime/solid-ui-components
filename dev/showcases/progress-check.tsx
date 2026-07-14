import { type Component, For } from "solid-js";
import { LargeProgressCheck } from "../../src/components/ProgressCheck";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";

export const ProgressCheckShowcase: Component = () => (
  <div class="component-section">
    <h2>ProgressCheck — Primitive (Depth 0)</h2>
    <p class="text-meta">
      Circular progress + completion check. Useful as a compact next-to-label
      indicator. Pass <code>progress</code> 0–1.
    </p>
    <div class="example-group">
      <h3>Progress values</h3>
      <Row gap="sm" align="center">
        <For each={[0, 0.25, 0.5, 0.75, 1]}>
          {(p) => (
            <Stack gap="xs" align="center">
              <LargeProgressCheck progress={p} />
              <span class="text-meta">{Math.round(p * 100)}%</span>
            </Stack>
          )}
        </For>
      </Row>
    </div>
  </div>
);
