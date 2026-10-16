// StampedRow — one timestamped line: glyph by kind, ellipsizing label, mono time.
import { type Component, For } from "solid-js";
import { PinnedStampedRow, StampedRow, type StampKind } from "../../src/components/StampedRow";
import { SectionTitle, MutedBody } from "../../src/components/Text";

const KINDS: StampKind[] = ["started", "active", "note", "done", "completed"];
const AT = new Date(2026, 9, 15, 14, 5);

export const StampedRowShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>StampedRow</SectionTitle>
      <MutedBody>The 22px list line, one per kind. The glyph follows the kind; a long label ellipsizes.</MutedBody>
      <div class="stamped-row-demo">
        <For each={KINDS}>{(k) => <StampedRow kind={k} label={`Step ${k}`} t={AT} />}</For>
        <StampedRow kind="note" label="A label far too long to fit in this narrow demo column, so it ellipsizes" t={AT} />
      </div>
    </div>
    <div class="example-group">
      <SectionTitle>PinnedStampedRow</SectionTitle>
      <MutedBody>The 40px bar: the current step pinned above a scrolling region.</MutedBody>
      <div class="stamped-row-demo">
        <PinnedStampedRow kind="active" label="Current step" t={AT} />
      </div>
    </div>
  </div>
);
