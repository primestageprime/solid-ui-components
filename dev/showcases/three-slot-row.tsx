// ThreeSlotRow — start | centre | end on one line, the centre centred in the
// space the other two leave. Header layout A from the Taskmaster canon.
import { type Component } from "solid-js";
import {
  ThreeSlotRow,
  createThreeSlotRow,
} from "../../src/components/ThreeSlotRow";
import { EndClusterRow } from "../../src/components/Layout";
import { PageTitle, TextSublabel } from "../../src/components/Text";
import { CountChip } from "../../src/components/Badge";

const LogoBoxRow = createThreeSlotRow({ startWidth: "160px" });

export const ThreeSlotRowShowcase: Component = () => (
  <div class="component-section component-section--full">
    <h2>ThreeSlotRow — Composite (Depth 2)</h2>
    <p class="text-meta">
      Grid tracks <code>start minmax(0, 1fr) auto</code>. The centre slot is
      centred in the remainder, not in the viewport, so a wide start slot moves
      it right instead of overlapping. Composes a curried <code>Grid</code>,{" "}
      <code>ClusterRow</code>, <code>GrowCenterRow</code> and{" "}
      <code>EndClusterRow</code>; owns no CSS.
    </p>

    <div class="example-group">
      <h3>ThreeSlotRow — start track at its content width</h3>
      <div class="three-slot-row-demo">
        <ThreeSlotRow
          start={<PageTitle>Taskmaster</PageTitle>}
          center={<TextSublabel>centred in the remainder</TextSublabel>}
          end={<CountChip count={3} label="open" />}
        />
      </div>
    </div>

    <div class="example-group">
      <h3>createThreeSlotRow(&#123; startWidth: "160px" &#125;)</h3>
      <p class="text-meta">
        A fixed logo box. Narrow the window: the start and end keep their
        width and the centre gives way first.
      </p>
      <div class="three-slot-row-demo">
        <LogoBoxRow
          start={<PageTitle>Logo</PageTitle>}
          center={<TextSublabel>nav goes here</TextSublabel>}
          end={<TextSublabel>status · user</TextSublabel>}
        />
      </div>
    </div>

    <div class="example-group">
      <h3>EndClusterRow — the end slot, never wrapping</h3>
      <p class="text-meta">
        <code>justify:end; align:center; gap:xs</code>, no wrap. The sibling of{" "}
        <code>EndWrapRow</code>, which wraps at phone width.
      </p>
      <div class="three-slot-row-demo three-slot-row-demo--narrow">
        <EndClusterRow>
          <CountChip count={12} label="open" />
          <TextSublabel>user@example.com</TextSublabel>
        </EndClusterRow>
      </div>
    </div>
  </div>
);
