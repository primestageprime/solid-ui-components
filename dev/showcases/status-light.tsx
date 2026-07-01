import { type Component, For } from "solid-js";
import type {StatusLightVariant} from "../../src/components/StatusLight";
import { StatusLight } from "../../src/components/StatusLight/StatusLight";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";

const VARIANTS: StatusLightVariant[] = ["success", "warning", "danger", "info", "idle"];

export const StatusLightShowcase: Component = () => (
  <div class="component-section">
    <h2>StatusLight — Primitive (Depth 0)</h2>
    <p class="text-meta">
      LED-style indicator dot with optional pulse. Drop next to a label to
      show liveness or alert state. For sparkline-driven liveness, use
      <code> ConnectionStatus </code> instead.
    </p>

    <div class="example-group">
      <h3>Variants</h3>
      <Row gap="sm" align="center" wrap>
        <For each={VARIANTS}>
          {(v) => (
            <Stack gap="xs" align="center">
              <StatusLight variant={v} size="md" />
              <span class="text-meta">{v}</span>
            </Stack>
          )}
        </For>
      </Row>
    </div>

    <div class="example-group">
      <h3>Sizes</h3>
      <Row gap="sm" align="center">
        <Stack gap="xs" align="center"><StatusLight variant="success" size="sm" /><span class="text-meta">sm</span></Stack>
        <Stack gap="xs" align="center"><StatusLight variant="success" size="md" /><span class="text-meta">md</span></Stack>
        <Stack gap="xs" align="center"><StatusLight variant="success" size="lg" /><span class="text-meta">lg</span></Stack>
      </Row>
    </div>

    <div class="example-group">
      <h3>Pulse + label</h3>
      <Row gap="sm" align="center">
        <StatusLight variant="success" pulse label="connected" />
        <StatusLight variant="warning" pulse label="reconnecting" />
        <StatusLight variant="danger" label="failed" />
      </Row>
    </div>
  </div>
);
