import { type Component, createSignal } from "solid-js";
import { ThemedNumberInput } from "../../src/components/ThemedNumberInput";
import { Stack } from "../../src/components/Layout/Stack";
import { Row } from "../../src/components/Layout/Row";
import { NarrowStack } from "../../src/components/Layout";
import { Text } from "../../src/components/Text/Text";
import { Button } from "../../src/components/Button/Button";
import { Dropdown } from "../../src/components/Dropdown/Dropdown";

/** Neighbours for the toolbar-size row — the controls a compact number input
 *  has to line up with. */
const SCALE_ITEMS = [
  { id: "linear", label: "Linear" },
  { id: "log", label: "Log" },
];

export const ThemedNumberInputShowcase: Component = () => {
  const [plain, setPlain] = createSignal<number | undefined>(undefined);
  const [labeled, setLabeled] = createSignal<number | undefined>(42);
  const [described, setDescribed] = createSignal<number | undefined>(1200);
  const [withError, setWithError] = createSignal<number | undefined>(-5);
  const [bounded, setBounded] = createSignal<number | undefined>(500);
  const [locked] = createSignal<number | undefined>(99);
  const [compact, setCompact] = createSignal<number | undefined>(120);
  const [scale, setScale] = createSignal("linear");

  const errorMessage = () =>
    (withError() ?? 0) < 0 ? "Value must be non-negative." : undefined;

  return (
    <div class="component-section">
      <h2>ThemedNumberInput — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (ThemedNumberInput.css), composes Icon for stepper triggers.
        Kobalte-backed (`@kobalte/core/number-field`). Zero-config default —
        <code> &lt;ThemedNumberInput name="qty" /&gt;</code> is an unbounded
        field with step 1. All other `NumberFieldRootProps` are forwarded via
        spread.
      </p>

      <div class="example-group">
        <h3>Default (zero config)</h3>
        <NarrowStack>
          <div class="text-meta">
            No label, no bounds, step 1. Emits `undefined` when cleared
            (kobalte's NaN is normalized out).
          </div>
          <div class="demo-maxw-240">
            <ThemedNumberInput name="plain" value={plain} onChange={setPlain} />
          </div>
        </NarrowStack>
        <Text variant="sublabel">
          Value: {plain() === undefined ? "(none)" : String(plain())}
        </Text>
      </div>

      <div class="example-group">
        <h3>Labeled</h3>
        <div class="demo-maxw-240">
          <ThemedNumberInput
            name="quantity"
            label="Quantity"
            value={labeled}
            onChange={setLabeled}
          />
        </div>
        <Text variant="sublabel">
          Value: {labeled() === undefined ? "(none)" : String(labeled())}
        </Text>
      </div>

      <div class="example-group">
        <h3>With description</h3>
        <div class="demo-maxw-320">
          <ThemedNumberInput
            name="engine-kw"
            label="Engine Power"
            description="Rated mechanical output in kilowatts."
            value={described}
            onChange={setDescribed}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>With error message</h3>
        <NarrowStack>
          <div class="text-meta">
            When `errorMessage` is present, the field renders in invalid state
            and the description (if any) is suppressed.
          </div>
          <div class="demo-maxw-320">
            <ThemedNumberInput
              name="elevation"
              label="Elevation (m)"
              description="Positive integer, metres above sea level."
              value={withError}
              onChange={setWithError}
              errorMessage={errorMessage()}
            />
          </div>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Bounded (min + max + step)</h3>
        <NarrowStack>
          <div class="text-meta">
            `min=0`, `max=1000`, `step=50`. The stepper triggers disable at the
            bounds via kobalte's built-in behavior.
          </div>
          <div class="demo-maxw-240">
            <ThemedNumberInput
              name="rpm"
              label="RPM"
              value={bounded}
              onChange={setBounded}
              min={0}
              max={1000}
              step={50}
            />
          </div>
        </NarrowStack>
        <Stack gap="xs">
          <Text variant="sublabel">
            Value: {bounded() === undefined ? "(none)" : String(bounded())}
          </Text>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Toolbar size (`size="sm"`)</h3>
        <NarrowStack>
          <div class="text-meta">
            29px tall, so it lines up with `Button size="sm"` and `Dropdown
            size="sm"` in a dense row. The default `md` field is 43px — the
            tallest control in the family — which is what made a number input
            set the height of any toolbar it sat in. Compare the two rows: the
            `sm` row is flush, the `md` row is not.
          </div>
          <Row gap="sm" align="center">
            <div class="demo-maxw-240">
              <ThemedNumberInput
                name="y-max-sm"
                size="sm"
                value={compact}
                onChange={setCompact}
              />
            </div>
            <Dropdown
              items={SCALE_ITEMS}
              value={scale()}
              onChange={setScale}
              size="sm"
            />
            <Button size="sm">Apply</Button>
          </Row>
          <Row gap="sm" align="center">
            <div class="demo-maxw-240">
              <ThemedNumberInput
                name="y-max-md"
                value={compact}
                onChange={setCompact}
              />
            </div>
            <Dropdown
              items={SCALE_ITEMS}
              value={scale()}
              onChange={setScale}
              size="sm"
            />
            <Button size="sm">Apply</Button>
          </Row>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Disabled</h3>
        <NarrowStack>
          <div class="text-meta">
            `disabled` forwarded to kobalte's root — input and triggers are
            non-interactive and opacity drops.
          </div>
          <div class="demo-maxw-240">
            <ThemedNumberInput
              name="locked"
              label="Threshold (locked)"
              value={locked}
              disabled
            />
          </div>
        </NarrowStack>
      </div>
    </div>
  );
};
