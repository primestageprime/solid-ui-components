// The discard-staging shape (added 2026-07-31 with `Bucket.collapsible`).
//
// Rejecting a suggestion stages it in a pile instead of skipping it
// permanently, and one button commits the whole pile. The pile must not
// dominate the queue — so it renders as a one-line summary even holding items —
// but it has to be openable, because the whole point of staging is being able
// to look at what you staged and pull something back out before committing.
//
// Three behaviours worth exercising here rather than reading about:
//   * discarding closes the gap in Suggestions even though the destination
//     renders no row to arrive into, and the pile's count pulses;
//   * an EMPTY pile looks exactly like any other empty bucket — no chevron, no
//     toggle, its emptyLabel showing — because there is nothing to expand into;
//   * once you open the pile it STAYS open, including after "Empty N discards"
//     drains it and new discards refill it. If you opened it, you wanted it open.
import { createSignal } from "solid-js";
import { BucketQueue, type Bucket } from "../../../src/components/BucketQueue";
import { SmallPrimaryButton, SmallGhostButton } from "../../../src/components/Button/variants";
import { EllipsizedTitle, FadedNowrapSublabel } from "../../../src/components/Text";
import { SpreadRow, WrappedClusterRow } from "../../../src/components/Layout";
import { filter, map } from "../../../src/fn";

interface Suggestion {
  id: string;
  label: string;
  amount: string;
  bucket: string;
}

const BUCKETS: Bucket[] = [
  { key: "todo", label: "Suggestions", tone: "accent" },
  {
    key: "kept",
    label: "Accepted",
    tone: "success",
    emptyLabel: "Nothing accepted yet",
  },
  {
    key: "discard",
    label: "Discard",
    tone: "muted",
    collapsible: true,
    collapsedByDefault: true,
    emptyLabel: "Nothing discarded",
  },
];

const LABELS = [
  ["Shell fuel", "$84.20"],
  ["Costco", "$212.09"],
  ["Netflix", "$15.49"],
  ["Delta 1182", "$408.00"],
  ["Whole Foods", "$61.30"],
  ["Venmo — Ana", "$40.00"],
  ["ATM withdrawal", "$100.00"],
  ["Spotify", "$11.99"],
];

const SEED: Suggestion[] = map(
  ([label, amount]: string[], i: number) => ({
    id: `s${i}`,
    label,
    amount,
    bucket: "todo",
  }),
  LABELS,
);

export function DiscardStagingDemo() {
  const [items, setItems] = createSignal<Suggestion[]>(SEED);
  const [selected, setSelected] = createSignal<string | undefined>("s0");

  const moveTo = (bucket: string) => {
    const id = selected();
    if (!id) return;
    setItems((rows) =>
      map((r: Suggestion) => (r.id === id ? { ...r, bucket } : r), rows),
    );
  };
  const discards = () => filter((r: Suggestion) => r.bucket === "discard", items());
  const emptyDiscards = () =>
    setItems((rows) => filter((r: Suggestion) => r.bucket !== "discard", rows));

  return (
    <div class="bucket-queue-discard-demo">
      {/* No `height` prop — the queue takes whatever the fixed column leaves
          it, which is the shape that makes the pile's footprint legible. */}
      <BucketQueue<Suggestion>
        buckets={BUCKETS}
        items={items()}
        bucketOf={(s) => s.bucket}
        keyOf={(s) => s.id}
        renderItem={(s) => (
          <SpreadRow>
            <EllipsizedTitle>{s.label}</EllipsizedTitle>
            <FadedNowrapSublabel>{s.amount}</FadedNowrapSublabel>
          </SpreadRow>
        )}
        selectedKey={selected()}
        onSelect={(key) => setSelected(key ?? undefined)}
      />
      <WrappedClusterRow>
        <SmallPrimaryButton disabled={!selected()} onClick={() => moveTo("kept")}>
          Accept selected
        </SmallPrimaryButton>
        <SmallGhostButton disabled={!selected()} onClick={() => moveTo("discard")}>
          Discard selected
        </SmallGhostButton>
        <SmallGhostButton disabled={discards().length === 0} onClick={emptyDiscards}>
          Empty {discards().length} discards
        </SmallGhostButton>
      </WrappedClusterRow>
    </div>
  );
}
