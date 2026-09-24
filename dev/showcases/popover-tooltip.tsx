import { type Component, createSignal, For } from "solid-js";
import { PopoverTooltip } from "../../src/components/Tooltip";
import {
  PrimaryButton,
  GhostButton,
  OutlinedButton,
} from "../../src/components/Button";
import { Text } from "../../src/components/Text/Text";
import { Stack } from "../../src/components/Layout/Stack";
import { Row } from "../../src/components/Layout/Row";
import { NarrowStack } from "../../src/components/Layout";
import { ScrollRegionMd } from "../../src/components/ScrollRegion";

const ROWS = Array.from({ length: 30 }, (_, i) => `Row ${i + 1} of 30`);

export const PopoverTooltipShowcase: Component = () => {
  const [count, setCount] = createSignal(0);

  return (
    <div class="component-section">
      <h2>PopoverTooltip — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (PopoverTooltip.css). Kobalte Popover-backed variant of
        Tooltip that ALSO opens on tap/click, unlike Tooltip — Kobalte's
        Tooltip trigger can only ever be closed by a click, never opened by
        one, and ignores touch for hover. This composes Popover (whose
        trigger already toggles on click, and whose content already
        dismisses on outside-click/Escape) with hand-rolled hover/focus-open
        logic, so tap, hover, and keyboard focus all open it, and it stays
        open while the pointer is over the content.
      </p>

      <div class="example-group">
        <h3>Tap to open, tap again to close</h3>
        <NarrowStack>
          <div class="text-meta">
            Click/tap the trigger. Unlike Tooltip, a click opens it — a
            second click toggles it closed.
          </div>
          <PopoverTooltip content="Tapped open. Tap the trigger again to close.">
            <PrimaryButton>Tap me</PrimaryButton>
          </PopoverTooltip>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Hover and keyboard focus still work</h3>
        <NarrowStack>
          <div class="text-meta">
            Hover or Tab to the trigger — opens exactly like Tooltip. Move the
            pointer off (or blur) and it closes.
          </div>
          <PopoverTooltip content="Opens on hover or focus too.">
            <OutlinedButton>Hover or focus</OutlinedButton>
          </PopoverTooltip>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Stays open while scrolling the popover's own content</h3>
        <NarrowStack>
          <div class="text-meta">
            Tap to open, then move the pointer into the popover and scroll —
            it stays open (a short grace delay bridges the trigger-to-content
            gap). This is the shape the import prototype's Count cell needs:
            a small scrollable table inside the popover.
          </div>
          <PopoverTooltip
            content={
              <ScrollRegionMd>
                <Stack gap="xs">
                  <For each={ROWS}>{(row) => <Text variant="body">{row}</Text>}</For>
                </Stack>
              </ScrollRegionMd>
            }
          >
            <GhostButton>Count: 30</GhostButton>
          </PopoverTooltip>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Reactive accessor content</h3>
        <NarrowStack>
          <div class="text-meta">
            `content` is an accessor — re-reads on each open, same contract
            as Tooltip.
          </div>
          <Row gap="sm" align="center">
            <PrimaryButton onClick={() => setCount(count() + 1)}>
              Increment ({count()})
            </PrimaryButton>
            <PopoverTooltip content={() => `Current count: ${count()}`}>
              <OutlinedButton>Tap or hover</OutlinedButton>
            </PopoverTooltip>
          </Row>
        </NarrowStack>
      </div>
    </div>
  );
};
