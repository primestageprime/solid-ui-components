// The two defects fixed on 2026-07-28, both visible in one bench.
//
// The reported case (thorcasting `/configure`): a short bucket of ONE-LINE
// balance rows above a long bucket of TWO-LINE config rows, with an "Add
// config" button pinned under the queue. Two things went wrong there, and this
// demo lets you switch each of them back on:
//
//   * the queue measured ONE row for the whole bar, so Configs was sized from a
//     Balances row and came out ~360px short while its own body scrolled;
//   * nothing could absorb the leftover, so the queue shrink-wrapped and left a
//     band of dead space between the last row and the button.
//
// Row height is still not a prop — the fix is that the queue measures a row per
// bucket instead of one for the bar. The toggle below can only change the
// DATA (one-line vs two-line config rows); it cannot change what is measured.
import { type JSX, createSignal, For } from "solid-js";
import { BucketQueue, type Bucket } from "../../../src/components/BucketQueue";
import { SmallPrimaryButton, SmallGhostButton } from "../../../src/components/Button/variants";
import { MutedBody, EllipsizedTitle, FadedNowrapSublabel } from "../../../src/components/Text";
import { NarrowStack, WrappedClusterRow } from "../../../src/components/Layout";

interface Row {
  id: string;
  label: string;
  /** Second line — present on config rows, absent on balance rows. */
  meta?: string;
  bucket: string;
}

const BALANCES: Row[] = [
  { id: "b1", label: "Everyday account", bucket: "balance" },
  { id: "b2", label: "Savings", bucket: "balance" },
];

const CONFIG_LABELS = [
  ["Rent", "Monthly · $2,400"],
  ["Groceries", "Weekly · $180"],
  ["Power", "Quarterly · $310"],
  ["Car insurance", "Annual · $890"],
  ["Streaming", "Monthly · $46"],
  ["Gym", "Fortnightly · $38"],
  ["Phone", "Monthly · $59"],
  ["Council rates", "Quarterly · $520"],
];

const configs = (n: number): Row[] =>
  CONFIG_LABELS.slice(0, n).map(([label, meta], i) => ({
    id: `c${i}`,
    label,
    meta,
    bucket: "configs",
  }));

// Balances keeps `capRows: 3` and does NOT fill — it is meant to stay small.
// Configs fills, so it reaches the button whether it has three rows or thirty.
const bucketsFor = (fill: boolean): Bucket[] => [
  { key: "balance", label: "Balances", tone: "success", capRows: 3 },
  { key: "configs", label: "Configs", tone: "accent", fill, emptyLabel: "No configs yet" },
];

// A balance row is ONE line; a config row STACKS its cadence/amount summary
// under the name, so it is genuinely twice as tall. That difference is the
// whole point of the bench — sizing one bucket from the other's row is what
// under-measured Configs by half.
const renderRow = (r: Row): JSX.Element =>
  r.meta == null ? (
    <EllipsizedTitle>{r.label}</EllipsizedTitle>
  ) : (
    <NarrowStack>
      <EllipsizedTitle>{r.label}</EllipsizedTitle>
      <FadedNowrapSublabel>{r.meta}</FadedNowrapSublabel>
    </NarrowStack>
  );

export function FillDemo(): JSX.Element {
  const [fill, setFill] = createSignal(true);
  const [twoLine, setTwoLine] = createSignal(true);
  const [count, setCount] = createSignal(3);

  const items = (): Row[] => [
    ...BALANCES,
    ...configs(count()).map((c) => (twoLine() ? c : { ...c, meta: undefined })),
  ];

  return (
    <NarrowStack>
      <WrappedClusterRow>
        <SmallPrimaryButton onClick={() => setFill((f) => !f)}>
          fill: {String(fill())}
        </SmallPrimaryButton>
        <SmallGhostButton onClick={() => setTwoLine((t) => !t)}>
          {twoLine() ? "Two-line config rows" : "One-line config rows"}
        </SmallGhostButton>
        <For each={[1, 3, 8]}>
          {(n) => (
            <SmallGhostButton onClick={() => setCount(n)}>
              {n} config{n === 1 ? "" : "s"}
            </SmallGhostButton>
          )}
        </For>
      </WrappedClusterRow>

      <MutedBody>
        Turn <strong>fill</strong> off and the queue shrink-wraps: the gap opens
        between the last config and the button below, and it grows as you drop
        to fewer configs. Turn it on and Configs reaches the button at every
        count — including one row. Balances never moves either way; it declares
        no <code>fill</code>, so it stays at its content (capped at three rows).
      </MutedBody>
      <MutedBody>
        Switch the config rows between one and two lines with{" "}
        <strong>fill</strong> off. Both bucket heights track their own rows.
        Before the fix, Configs was sized from a <em>Balances</em> row —
        one line tall — so the two-line setting under-measured it by half and
        scrolled content it had the room for.
      </MutedBody>

      <div class="bucket-queue-fill-demo">
        <BucketQueue<Row>
          buckets={bucketsFor(fill())}
          items={items()}
          bucketOf={(i) => i.bucket}
          keyOf={(i) => i.id}
          renderItem={renderRow}
        />
        <SmallPrimaryButton onClick={() => undefined}>
          Add config ＋
        </SmallPrimaryButton>
      </div>
    </NarrowStack>
  );
}
