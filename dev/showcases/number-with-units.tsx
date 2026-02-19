import { Component } from "solid-js";
import { NumberWithUnits } from "../../src/components/DataDisplay";
import { Stack } from "../../src/components/Layout";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const NumberWithUnitsShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>NumberWithUnits — Depth 2 (zero CSS)</h2>
      <p class="text-meta">Composes Text (curried: MonoValue + TextUnits). Monospace value paired with units label.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Emissions</h3>
          <Stack gap="sm">
            <NumberWithUnits value={8.42} units="ppm" />
            <NumberWithUnits value={3.81} units="g/kWh" precision={2} />
          </Stack>

          <h3 style={{ "margin-top": "24px" }}>Composed — Power</h3>
          <Stack gap="sm">
            <NumberWithUnits value={1200} units="kW" />
            <NumberWithUnits value={2841.3} units="scfm" precision={1} />
          </Stack>

          <h3 style={{ "margin-top": "24px" }}>Composed — Percentage</h3>
          <Stack gap="sm">
            <NumberWithUnits value={90} units="%" />
          </Stack>

          <h3 style={{ "margin-top": "24px" }}>Composed — Color-Coded</h3>
          <Stack gap="sm">
            <NumberWithUnits value={0.42} units="ppm" precision={2} color="#00ff88" />
            <NumberWithUnits value={12.7} units="ppm" precision={1} color="#ff0040" />
          </Stack>

          <h3 style={{ "margin-top": "24px" }}>Composed — Null Fallback</h3>
          <Stack gap="sm">
            <NumberWithUnits value={null} units="kW" />
            <NumberWithUnits value={undefined} units="ppm" />
          </Stack>
        </div>
        <div class="depth2-atoms">
          <h3>Curried Variants Used</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">MonoValue</div>
              <div class="text-meta">monospace, 1.5rem / 600 weight</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">TextUnits</div>
              <div class="text-meta">sans-serif, 0.9rem, normal weight</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
