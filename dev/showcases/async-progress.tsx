import { type Component, createSignal } from "solid-js";
import { AsyncProgress } from "../../src/components/Progress";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";

/**
 * AsyncProgress showcase — closes the showcase gap so the layout-purity
 * migration (outer column → TightStack, header → BaselineSpreadRow) is
 * visually verifiable. The bar strip stays an intrinsic single-widget internal.
 */
export const AsyncProgressShowcase: Component = () => {
  const [active, setActive] = createSignal(true);
  return (
    <div class="component-section">
      <h2>AsyncProgress — Primitive (Depth 1)</h2>
      <p class="text-meta">
        Time-based progress bar that estimates completion from historical max
        durations (localStorage). Label + elapsed/est timing above a fill bar.
      </p>

      <div class="example-group">
        <h3>Running (indeterminate until a duration is recorded)</h3>
        <Stack gap="sm" class="async-progress-demo">
          <AsyncProgress
            processId="showcase-ocr"
            label="Processing with Claude Vision"
            active={active()}
          />
          <AsyncProgress
            processId="showcase-publish"
            label="Publishing document"
            active={active()}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Toggle</h3>
        <Row gap="sm" align="center">
          <button type="button" onClick={() => setActive((a) => !a)}>
            {active() ? "Stop" : "Start"}
          </button>
          <span class="text-meta">active = {String(active())}</span>
        </Row>
      </div>
    </div>
  );
};
