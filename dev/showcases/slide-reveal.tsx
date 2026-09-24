import { type Component, type JSX, createSignal } from "solid-js";
import { SlideReveal } from "../../src/components/SlideReveal";
import { ReservedWidth } from "../../src/components/ReservedWidth";
import {
  SmallOutlinedButton,
  IconOnlyButton,
} from "../../src/components/Button";
import { Icon } from "../../src/components/Icon";
import { ClusterRow } from "../../src/components/Layout";
import { TagPill } from "../../src/components/Badge";

/** A pill whose actions slide out beside it. */
const Draft = (props: { open: boolean }): JSX.Element => (
  <ClusterRow>
    <TagPill tag={{ label: "Draft" }} />
    <SlideReveal when={props.open}>
      <ClusterRow>
        <IconOnlyButton aria-label="Save" title="Save">
          <Icon name="check" size="sm" />
        </IconOnlyButton>
        <IconOnlyButton aria-label="Reset" title="Reset">
          <Icon name="undo" size="sm" />
        </IconOnlyButton>
      </ClusterRow>
    </SlideReveal>
  </ClusterRow>
);

export const SlideRevealShowcase: Component = () => {
  const [open, setOpen] = createSignal(false);
  return (
    <div class="component-section">
      <h2>SlideReveal — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Slides its children in and out horizontally: its box grows from zero to
        the children's own width (a 0fr ↔ 1fr grid column — no measuring) while
        they fade, in 180ms; instant under prefers-reduced-motion. Collapsed
        children stay mounted but inert. Because its box grows, wrap the thing
        it lives in with <code>ReservedWidth</code> — an invisible outer element
        holding the widest state — so neighbours never move (Peter's rule). The
        pill after it stays put.
      </p>

      <div class="example-group">
        <h3>Reveal actions beside a pill, inside a reservation</h3>
        <ClusterRow>
          <SmallOutlinedButton onClick={() => setOpen((o) => !o)}>
            Toggle actions
          </SmallOutlinedButton>
          <ReservedWidth widest={<Draft open />}>
            <Draft open={open()} />
          </ReservedWidth>
          <TagPill tag={{ label: "neighbour — never moves" }} />
        </ClusterRow>
      </div>
    </div>
  );
};
