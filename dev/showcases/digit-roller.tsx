import { createSignal, type Component } from "solid-js";
import { DigitRoller } from "../../src/components/DataDisplay";
import { ClusterRow, NarrowStack } from "../../src/components/Layout";
import { TextSublabel, TextUnits } from "../../src/components/Text";

export const DigitRollerShowcase: Component = () => {
  const [rollerAnimating, setRollerAnimating] = createSignal(false);
  const [rollerValueA] = createSignal("3.412");
  const [rollerValueB] = createSignal("2.116");
  const [rollerCurrent, setRollerCurrent] = createSignal("3.412");
  const [rollerPrev, setRollerPrev] = createSignal<string | null>(null);

  const triggerRoll = () => {
    const next =
      rollerCurrent() === rollerValueA() ? rollerValueB() : rollerValueA();
    setRollerPrev(rollerCurrent());
    setRollerCurrent(next);
    setRollerAnimating(true);
  };

  return (
    <div class="component-section">
      <h2>DigitRoller — Composed (Depth 2)</h2>
      <p class="text-meta">
        Owns CSS (DigitRoller.css), no component imports. Animated
        digit-by-digit value transition.
      </p>

      <div class="example-group">
        <h3>Animated Transition</h3>
        <NarrowStack>
        <TextSublabel>
          Vertical digit rolling animation for transitioning between numeric
          values.
        </TextSublabel>
        <ClusterRow>
          <span class="digit-roller-demo__value digit-roller-demo__value--tnum">
            <DigitRoller
              value={rollerCurrent()}
              previousValue={rollerPrev()}
              animate={rollerAnimating()}
              onAnimationEnd={() => setRollerAnimating(false)}
            />
          </span>
          <TextUnits>g/kWh</TextUnits>
          <button class="demo-btn" onClick={triggerRoll}>
            Roll to{" "}
            {rollerCurrent() === rollerValueA()
              ? rollerValueB()
              : rollerValueA()}
          </button>
        </ClusterRow>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Static (no animation)</h3>
        <div class="digit-roller-demo__value">
          <DigitRoller value="0.1250" />
        </div>
      </div>

      <div class="example-group">
        <h3>Tabular digits</h3>
        <div class="digit-roller-demo__value digit-roller-demo__value--accent">
          <DigitRoller value="42.00" />
        </div>
      </div>
    </div>
  );
};
