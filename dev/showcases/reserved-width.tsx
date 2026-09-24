import { type Component, createSignal } from "solid-js";
import { ReservedWidth } from "../../src/components/ReservedWidth";
import { SmallOutlinedButton } from "../../src/components/Button";
import { ClusterRow } from "../../src/components/Layout";
import { TagPill } from "../../src/components/Badge";

export const ReservedWidthShowcase: Component = () => {
  const [long, setLong] = createSignal(false);
  const label = () => (long() ? "Unsaved changes — 3 edits" : "Saved");
  return (
    <div class="component-section">
      <h2>ReservedWidth — Atomic (Depth 1)</h2>
      <p class="text-meta">
        The invisible outer element that holds a component's WIDEST state, so
        whatever it animates or swaps through, its neighbours never move
        (Peter's rule: hold the space, but invisibly). It stacks the live
        content and an invisible, inert copy of the widest state in one grid
        cell; the live content keeps hugging itself.
      </p>

      <div class="example-group">
        <h3>A status that changes length — the neighbour stays put</h3>
        <ClusterRow>
          <SmallOutlinedButton onClick={() => setLong((l) => !l)}>
            Toggle status
          </SmallOutlinedButton>
          <ReservedWidth
            widest={<TagPill tag={{ label: "Unsaved changes — 3 edits" }} />}
          >
            <TagPill tag={{ label: label() }} />
          </ReservedWidth>
          <TagPill tag={{ label: "neighbour — never moves" }} />
        </ClusterRow>
      </div>
    </div>
  );
};
