// The header-action shape (added 2026-09-24 with `Bucket.headerAction`).
//
// A "Dismiss all" action lives in the Discard pile's own header instead of
// as an external button below the queue — the natural place for a bulk
// action that only makes sense for the one bucket it clears. It renders next
// to the count, and because it is a DOM sibling of the collapse-toggle
// button (not nested inside it), clicking it dismisses the pile without
// toggling the disclosure — even though Discard is collapsible here too.
import { createSignal } from "solid-js";
import { BucketQueue, type Bucket } from "../../../src/components/BucketQueue";
import { GlyphSlotGhostButton } from "../../../src/components/Button/variants";
import { EllipsizedTitle, FadedNowrapSublabel } from "../../../src/components/Text";
import { SpreadRow } from "../../../src/components/Layout";
import { filter, map } from "../../../src/fn";

interface Suggestion {
  id: string;
  label: string;
  amount: string;
  bucket: string;
}

const LABELS = [
  ["Shell fuel", "$84.20"],
  ["Costco", "$212.09"],
  ["Netflix", "$15.49"],
  ["Delta 1182", "$408.00"],
];

const SEED: Suggestion[] = map(
  ([label, amount]: string[], i: number) => ({
    id: `h${i}`,
    label,
    amount,
    bucket: i < 2 ? "todo" : "discard",
  }),
  LABELS,
);

export function HeaderActionDemo() {
  const [items, setItems] = createSignal<Suggestion[]>(SEED);
  const discards = () => filter((r: Suggestion) => r.bucket === "discard", items());
  const dismissAll = () =>
    setItems((rows) => filter((r: Suggestion) => r.bucket !== "discard", rows));

  const buckets: Bucket[] = [
    { key: "todo", label: "Suggestions", tone: "accent" },
    {
      key: "discard",
      label: "Discard",
      tone: "muted",
      collapsible: true,
      emptyLabel: "Nothing discarded",
      // Rendered beside the count, as a sibling of the collapse toggle — a
      // click here never expands/collapses the pile. `GlyphSlotGhostButton`
      // pins its own box (24px, line-height 1) so it can never grow past the
      // header's own line box, which is what bucket 0's header measures for
      // every bucket's water-fill height (see types.ts / measurement.ts).
      headerAction: (
        <GlyphSlotGhostButton
          disabled={discards().length === 0}
          onClick={dismissAll}
          aria-label="Dismiss all discards"
        >
          Dismiss all
        </GlyphSlotGhostButton>
      ),
    },
  ];

  return (
    <div class="bucket-queue-header-action-demo">
      <BucketQueue<Suggestion>
        buckets={buckets}
        items={items()}
        bucketOf={(s) => s.bucket}
        keyOf={(s) => s.id}
        renderItem={(s) => (
          <SpreadRow>
            <EllipsizedTitle>{s.label}</EllipsizedTitle>
            <FadedNowrapSublabel>{s.amount}</FadedNowrapSublabel>
          </SpreadRow>
        )}
      />
    </div>
  );
}
