import { type Component, Show, createSignal } from "solid-js";
import { BusyOverlay } from "../../src/components/Feedback";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";
import { TextSublabel } from "../../src/components/Text";

/**
 * BusyOverlay showcase — the "working on it" state for a region whose content
 * should stay on screen underneath. Anchors to its nearest positioned
 * ancestor, so the demo frames below are position:relative.
 */
export const BusyOverlayShowcase: Component = () => {
  const [busy, setBusy] = createSignal(true);
  return (
    <div class="component-section">
      <h2>BusyOverlay — Composite (Depth 2)</h2>
      <p class="text-meta">
        A spinner over a dimmed scrim, filling its positioned parent. For a
        single opaque round trip with no honest percentage to report — a crop
        being applied, a panel mid-save. Use AsyncProgress or
        StackedProgressBar when a real proportion IS known. Sibling of
        InlineChartErrorOverlay, which does the same job for a failure.
      </p>

      <div class="example-group">
        <h3>Over content, with and without a label</h3>
        <Row gap="md" align="stretch" class="busy-overlay-demo">
          <div class="busy-overlay-demo__frame">
            <TextSublabel>Content underneath stays visible</TextSublabel>
            <Show when={busy()}>
              <BusyOverlay label="Cropping" />
            </Show>
          </div>
          <div class="busy-overlay-demo__frame">
            <TextSublabel>No label — the spinner alone</TextSublabel>
            <Show when={busy()}>
              <BusyOverlay />
            </Show>
          </div>
        </Row>
        <Stack gap="xs">
          <Row gap="sm" align="center">
            <button type="button" onClick={() => setBusy((b) => !b)}>
              {busy() ? "Finish" : "Start work"}
            </button>
            <span class="text-meta">busy = {String(busy())}</span>
          </Row>
        </Stack>
      </div>
    </div>
  );
};
