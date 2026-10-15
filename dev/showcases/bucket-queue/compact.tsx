// CompactBucketQueue (2026-10-15): the dense density for a narrow side pane.
// The same buckets at 340px in the comfortable density and at 200px compact,
// so the two sizes compare side by side. Invented names only.
import { createSignal } from "solid-js";
import { BucketQueue, CompactBucketQueue, type Bucket } from "../../../src/components/BucketQueue";
import { CompactLabel, EllipsizedTitle, TextSublabel } from "../../../src/components/Text";
import { EllipsisText } from "../../../src/components/DataDisplay";
import { SpreadRow } from "../../../src/components/Layout";
import { SmallStatusLight } from "../../../src/components/StatusLight";
import { map } from "../../../src/fn";

interface Group {
  id: string;
  name: string;
  bucket: string;
  status?: "done" | "forced";
}

const BUCKETS: Bucket[] = [
  { key: "review", label: "To review", tone: "accent" },
  { key: "drift", label: "Check the drift", tone: "warning" },
  { key: "fits", label: "Fits already", tone: "muted", collapsible: true, collapsedByDefault: true },
  { key: "flagged", label: "Flagged", tone: "danger", emptyLabel: "Nothing flagged" },
];

const SEED: Group[] = map(
  ([id, name, bucket, status]: string[]) => ({ id, name, bucket, status: status as Group["status"] }),
  [
    ["acme", "Acme Lumber Supply", "review"],
    ["birch", "Birchwood Freight and Storage Company", "review", "forced"],
    ["cobalt", "Cobalt Telecom", "drift", "done"],
    ["delta", "Delta Water Utility", "drift"],
    ["kestrel", "Kestrel Holdings", "drift", "done"],
    ["iris", "Iris Cleaning Co", "fits"],
    ["juniper", "Juniper Software", "fits"],
  ],
);

// A badge is taller than the compact 16px line, and the queue sizes every
// bucket from ONE measured row: rows must share one height. A status light fits.
const STATUS_VARIANT = { done: "success", forced: "warning" } as const;

export function CompactDemo() {
  const [selected, setSelected] = createSignal<string | undefined>("cobalt");
  const common = {
    buckets: BUCKETS,
    items: SEED,
    bucketOf: (g: Group) => g.bucket,
    keyOf: (g: Group) => g.id,
    selectedKey: selected(),
    onSelect: (k: string | null) => setSelected(k ?? undefined),
  };
  return (
    <div class="bucket-queue-compact-demo">
      <div class="bucket-queue-compact-demo__pane">
        <BucketQueue<Group>
          {...common}
          selectedKey={selected()}
          renderItem={(g) => <EllipsizedTitle>{g.name}</EllipsizedTitle>}
        />
      </div>
      <div class="bucket-queue-compact-demo__pane bucket-queue-compact-demo__pane--narrow">
        <CompactBucketQueue<Group>
          {...common}
          selectedKey={selected()}
          renderItem={(g) => (
            <SpreadRow>
              <EllipsisText tooltip={g.name}>
                {g.bucket === "fits" ? <TextSublabel>{g.name}</TextSublabel> : <CompactLabel>{g.name}</CompactLabel>}
              </EllipsisText>
              {g.status ? <SmallStatusLight variant={STATUS_VARIANT[g.status]} label={g.status} /> : null}
            </SpreadRow>
          )}
        />
      </div>
    </div>
  );
}
