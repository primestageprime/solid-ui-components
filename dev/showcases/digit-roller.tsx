import { createSignal, Component } from "solid-js";
import { DigitRoller } from "../../src/components/DataDisplay";

export const DigitRollerShowcase: Component = () => {
  const [rollerAnimating, setRollerAnimating] = createSignal(false);
  const [rollerValueA] = createSignal("3.412");
  const [rollerValueB] = createSignal("2.116");
  const [rollerCurrent, setRollerCurrent] = createSignal("3.412");
  const [rollerPrev, setRollerPrev] = createSignal<string | null>(null);

  const triggerRoll = () => {
    const next = rollerCurrent() === rollerValueA() ? rollerValueB() : rollerValueA();
    setRollerPrev(rollerCurrent());
    setRollerCurrent(next);
    setRollerAnimating(true);
  };

  return (
    <div class="component-section">
      <h2>DigitRoller — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (DigitRoller.css), no component imports. Animated digit-by-digit value transition.</p>

      <div class="example-group">
        <h3>Animated Transition</h3>
        <p style={{ color: "var(--jtf-text-muted)", "font-size": "12px", margin: "0 0 12px" }}>
          Vertical digit rolling animation for transitioning between numeric values.
        </p>
        <div style={{ display: "flex", "align-items": "center", gap: "20px" }}>
          <span style={{
            "font-size": "1.5rem",
            "font-weight": "600",
            color: "var(--jtf-text-primary)",
            "font-variant-numeric": "tabular-nums",
          }}>
            <DigitRoller
              value={rollerCurrent()}
              previousValue={rollerPrev()}
              animate={rollerAnimating()}
              onAnimationEnd={() => setRollerAnimating(false)}
            />
          </span>
          <span style={{ color: "var(--jtf-text-secondary)", "font-size": "0.9rem" }}>g/kWh</span>
          <button class="demo-btn" onClick={triggerRoll}>
            Roll to {rollerCurrent() === rollerValueA() ? rollerValueB() : rollerValueA()}
          </button>
        </div>
      </div>

      <div class="example-group">
        <h3>Static (no animation)</h3>
        <div style={{ "font-size": "1.5rem", "font-weight": "600", color: "var(--jtf-text-primary)" }}>
          <DigitRoller value="0.1250" />
        </div>
      </div>

      <div class="example-group">
        <h3>Tabular digits</h3>
        <div style={{ "font-size": "1.5rem", "font-weight": "600", color: "#00d4ff" }}>
          <DigitRoller value="42.00" />
        </div>
      </div>
    </div>
  );
};
