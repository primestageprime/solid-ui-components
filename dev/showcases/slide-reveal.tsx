import { type Component, createSignal } from "solid-js";
import { SlideReveal } from "../../src/components/SlideReveal";
import { SmallOutlinedButton, IconOnlyButton } from "../../src/components/Button";
import { Icon } from "../../src/components/Icon";
import { ClusterRow } from "../../src/components/Layout";
import { TagPill } from "../../src/components/Badge";

export const SlideRevealShowcase: Component = () => {
  const [open, setOpen] = createSignal(false);
  return (
    <div class="component-section">
      <h2>SlideReveal — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Slides its children in and out horizontally: the box animates between
        zero width and the children's own width (a 0fr ↔ 1fr grid column — no
        measuring) while they fade, in 180ms; instant under
        prefers-reduced-motion. Collapsed children stay mounted but inert, so a
        hidden button can be neither tabbed to nor clicked. One prop:{" "}
        <code>when</code>.
      </p>

      <div class="example-group">
        <h3>Reveal actions beside a pill</h3>
        <ClusterRow>
          <SmallOutlinedButton onClick={() => setOpen((o) => !o)}>
            {open() ? "Hide" : "Show"} actions
          </SmallOutlinedButton>
          <TagPill tag={{ label: "Draft" }} />
          <SlideReveal when={open()}>
            <ClusterRow>
              <IconOnlyButton aria-label="Save" title="Save">
                <Icon name="check" size="sm" />
              </IconOnlyButton>
              <IconOnlyButton aria-label="Reset" title="Reset">
                <Icon name="undo" size="sm" />
              </IconOnlyButton>
            </ClusterRow>
          </SlideReveal>
          <TagPill tag={{ label: "follows the reveal" }} />
        </ClusterRow>
      </div>
    </div>
  );
};
