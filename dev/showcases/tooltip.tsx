import { type Component, createSignal } from "solid-js";
import { Tooltip } from "../../src/components/Tooltip";
import {
  PrimaryButton,
  DangerButton,
  GhostButton,
  OutlinedButton,
} from "../../src/components/Button";
import { Text } from "../../src/components/Text/Text";
import { Stack } from "../../src/components/Layout/Stack";
import { Row } from "../../src/components/Layout/Row";

export const TooltipShowcase: Component = () => {
  const [count, setCount] = createSignal(0);

  return (
    <div class="component-section">
      <h2>Tooltip — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (Tooltip.css). Kobalte-backed hover/focus tooltip with arrow and fade animation.
        Accepts either a value or an accessor for `content`. Defaults to 100ms open/close delay;
        pass `openDelay={1000}` for the "cell" semantics used in dense table UIs.
      </p>

      <div class="example-group">
        <h3>Static string content</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Simplest form — `content` is a string literal.
        </div>
        <Tooltip content="Deletes the currently selected row. This action cannot be undone.">
          <DangerButton>Delete</DangerButton>
        </Tooltip>
      </div>

      <div class="example-group">
        <h3>JSX content</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `content` is a JSX fragment with multiple children and formatting.
        </div>
        <Tooltip
          content={
            <Stack gap="xs">
              <Text variant="label">Keyboard shortcut</Text>
              <Text variant="body">Press <kbd>Cmd</kbd> + <kbd>K</kbd> to open the palette.</Text>
            </Stack>
          }
        >
          <GhostButton>Help</GhostButton>
        </Tooltip>
      </div>

      <div class="example-group">
        <h3>Reactive accessor</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `content` is an accessor — re-reads on each tooltip open.
        </div>
        <Row gap="sm" align="center">
          <PrimaryButton onClick={() => setCount(count() + 1)}>
            Increment ({count()})
          </PrimaryButton>
          <Tooltip content={() => `Current count: ${count()}`}>
            <OutlinedButton>Hover me</OutlinedButton>
          </Tooltip>
        </Row>
      </div>

      <div class="example-group">
        <h3>Cell semantics (openDelay=1000)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          The old TooltipCell variant is just `openDelay=1000` with the `cell` trigger class —
          downstream Phase 8 inlines this instead of a separate component.
        </div>
        <Tooltip
          content="Full text: Lorem ipsum dolor sit amet, consectetur adipiscing elit."
          openDelay={1000}
          class="sui-tooltip__trigger--cell"
        >
          <span style={{ display: "inline-block", "max-width": "180px" }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </span>
        </Tooltip>
      </div>

      <div class="example-group">
        <h3>Placement via TooltipRootProps passthrough</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Any `TooltipRootProps` field (placement, gutter, etc.) is forwarded to Kobalte's Tooltip.Root.
        </div>
        <Row gap="sm">
          <Tooltip content="Anchored to the top" placement="top" gutter={8}>
            <GhostButton>Top</GhostButton>
          </Tooltip>
          <Tooltip content="Anchored to the right" placement="right" gutter={8}>
            <GhostButton>Right</GhostButton>
          </Tooltip>
          <Tooltip content="Anchored to the bottom" placement="bottom" gutter={8}>
            <GhostButton>Bottom</GhostButton>
          </Tooltip>
          <Tooltip content="Anchored to the left" placement="left" gutter={8}>
            <GhostButton>Left</GhostButton>
          </Tooltip>
        </Row>
      </div>
    </div>
  );
};
