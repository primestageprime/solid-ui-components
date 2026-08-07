import { type Component, createSignal } from "solid-js";
import { PickNumberLabel } from "../../src/components/PickNumberLabel";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";
import { TextSublabel } from "../../src/components/Text";

/**
 * PickNumberLabel showcase — the "N)" key hint for pick-one-of-N UIs, and its
 * pulse: a value that CHANGES replays a one-shot bounce, which is how a
 * keyboard pick gets acknowledged without remounting anything.
 */
export const PickNumberLabelShowcase: Component = () => {
  const [pulse, setPulse] = createSignal<Record<number, number>>({});
  const bump = (n: number) => setPulse((p) => ({ ...p, [n]: (p[n] ?? 0) + 1 }));

  return (
    <div class="component-section">
      <h2>PickNumberLabel — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Renders "N)" — the "press 1" / "press 2" hint beside each option in a
        numbered choice, e.g. a pairwise comparison. `pulse` takes any value
        that differs from its previous one (a counter, a timestamp); each
        change replays the scale-bounce. Undefined, and the first defined
        value, render inert — only a CHANGE pulses.
      </p>

      <div class="example-group">
        <h3>Inert</h3>
        <Row gap="md" align="center">
          <PickNumberLabel number={1} />
          <PickNumberLabel number={2} />
          <PickNumberLabel number={3} />
        </Row>
      </div>

      <div class="example-group">
        <h3>Pulse on pick</h3>
        <Stack gap="sm">
          <Row gap="md" align="center">
            <PickNumberLabel number={1} pulse={pulse()[1]} />
            <PickNumberLabel number={2} pulse={pulse()[2]} />
          </Row>
          <Row gap="sm" align="center">
            <button type="button" onClick={() => bump(1)}>
              Pick 1
            </button>
            <button type="button" onClick={() => bump(2)}>
              Pick 2
            </button>
          </Row>
          <TextSublabel>
            picks — 1: {pulse()[1] ?? 0} · 2: {pulse()[2] ?? 0}
          </TextSublabel>
        </Stack>
      </div>
    </div>
  );
};
