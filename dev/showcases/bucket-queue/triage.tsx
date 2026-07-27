import { type JSX, createSignal, For, Show } from "solid-js";
import {
  BucketQueue,
  type Bucket,
} from "../../../src/components/BucketQueue";
import {
  SmallPrimaryButton,
  SmallGhostButton,
} from "../../../src/components/Button/variants";
import {
  MutedBody,
  EllipsizedTitle,
  FadedNowrapSublabel,
} from "../../../src/components/Text";
import {
  NarrowStack,
  WrappedClusterRow,
  SpreadRow,
  BaselineSpreadRow,
} from "../../../src/components/Layout";

/* Demo item type — the same "transaction to categorize" framing as
 * SplitQueueList's showcase, now spread across THREE sections rather than a
 * resolved/unresolved pair. */
interface QueueItem {
  id: string;
  label: string;
  amount: string;
  /** Second line — only the card renderer below uses it. */
  meta: string;
  bucket: string;
}

// The queue being WORKED — where triage starts and returns to. The component
// has no such concept: sections are an ordered list and it never singles one
// out. Which one is primary is application policy, so it is named here.
const PRIMARY_BUCKET = "todo";

// EVERY section is `selectable`, so select mode spans the whole bar and a batch
// can be assembled across queues — check two Suggestions and one In progress
// and send all three somewhere in a single move.
//
// `selectable` is per-section precisely so this is a CHOICE: setting it on only
// the working queue scopes checking there and leaves every other section's rows
// still selecting on click while select mode is on. The trade-off of turning it
// on everywhere is that there is then no row left to single-select, so
// click-to-select is suspended for as long as select mode is on.

const BUCKETS: Bucket[] = [
  { key: "done", label: "Categorized", tone: "success", selectable: true },
  {
    key: "todo",
    label: "Suggestions",
    tone: "accent",
    selectable: true,
    emptyLabel: "All clear — every suggestion categorized",
  },
  {
    key: "hold",
    label: "In progress",
    tone: "muted",
    selectable: true,
    emptyLabel: "Nothing parked",
    // Exercises the scrolling path: the section holds at 3 rows tall and its
    // body scrolls once "hold" has more than that (it starts with 6 below).
    capRows: 3,
  },
];

const SEED: QueueItem[] = [
  { id: "t1", label: "AWS — invoice 8841", amount: "$1,204.00", meta: "Infrastructure · Apr 02", bucket: "done" },
  { id: "t2", label: "Figma annual", amount: "$540.00", meta: "Software · Apr 02", bucket: "done" },
  { id: "t3", label: "Coffee — Blue Bottle", amount: "$6.75", meta: "Uncategorized · Apr 03", bucket: "todo" },
  { id: "t4", label: "Rent — April", amount: "$3,500.00", meta: "Uncategorized · Apr 01", bucket: "todo" },
  { id: "t5", label: "Payroll — ACH", amount: "$22,910.12", meta: "Uncategorized · Apr 05", bucket: "todo" },
  { id: "t6", label: "GitHub seats", amount: "$84.00", meta: "Uncategorized · Apr 06", bucket: "todo" },
  { id: "t7", label: "Notion team", amount: "$120.00", meta: "Awaiting receipt · Apr 07", bucket: "hold" },
  { id: "t8", label: "Legal retainer", amount: "$4,000.00", meta: "Awaiting receipt · Apr 08", bucket: "hold" },
  { id: "t9", label: "Zoom annual", amount: "$199.00", meta: "Awaiting receipt · Apr 09", bucket: "hold" },
  { id: "t10", label: "1Password teams", amount: "$95.88", meta: "Awaiting receipt · Apr 10", bucket: "hold" },
  { id: "t11", label: "Datadog", amount: "$620.00", meta: "Awaiting receipt · Apr 11", bucket: "hold" },
  { id: "t12", label: "Linear seats", amount: "$96.00", meta: "Awaiting receipt · Apr 12", bucket: "hold" },
];

// ROW CARDS — one line: label left, right-aligned amount. The same SpreadRow
// idiom SplitQueueList's showcase uses. `.bucket-queue__row` lays this out beside
// the select-mode checkbox via its own flex row + `.bucket-queue__content`
// wrapper (see BucketQueue.css / BucketQueue.tsx), so a full-width
// flex child here sits correctly beside the checkbox rather than wrapping
// below it.
//
// Both renderers emit BARE content — `.bucket-queue__row` owns the padding, so
// the accent bar of a selected row can never touch what a consumer renders.
export const renderRow = (i: QueueItem): JSX.Element => (
  <SpreadRow>
    <EllipsizedTitle>{i.label}</EllipsizedTitle>
    <FadedNowrapSublabel>{i.amount}</FadedNowrapSublabel>
  </SpreadRow>
);

// LARGE CARDS — two lines: a title over a muted meta line, amount still pinned
// right. Structurally the same shape the workshop `split-queue` bench renders
// for vessel calls. Nothing about the queue changes: row height is a pure
// consequence of what `renderItem` draws, which is what makes this a real test
// of the sizing model — the water-fill measures a row rather than assuming one.
// BaselineSpreadRow, not SpreadRow: centering the amount against a two-line
// stack floats it between the two lines. Baseline alignment pins it to the
// title's baseline, so the amount reads as belonging to the title.
export const renderCard = (i: QueueItem): JSX.Element => (
  <BaselineSpreadRow>
    <NarrowStack>
      <EllipsizedTitle>{i.label}</EllipsizedTitle>
      <FadedNowrapSublabel>{i.meta}</FadedNowrapSublabel>
    </NarrowStack>
    <FadedNowrapSublabel>{i.amount}</FadedNowrapSublabel>
  </BaselineSpreadRow>
);

// ── The triage demo ─────────────────────────────────────────────────────────
// The headline interaction. Selecting a row shows its accent bar with NO
// background fill (readable even after the pointer leaves); the "Move to…"
// buttons change the selected item's `bucket`, which is the only thing that
// makes the queue animate a transfer — there is no separate resolve() call.
//
// Parameterized by the row renderer ALONE, so the two showcase instances drive
// the same sections, data and interactions and the only difference on screen is
// what `renderItem` draws. Each instance owns its own state.
export function BucketQueueDemo(props: {
  renderItem: (item: QueueItem) => JSX.Element;
  demoClass: string;
}) {
  const [items, setItems] = createSignal<QueueItem[]>(SEED);
  const [selected, setSelected] = createSignal<string | undefined>("t3");
  const [focused, setFocused] = createSignal<string | undefined>(undefined);
  const [selectMode, setSelectMode] = createSignal(false);
  const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set());

  // The section the last move pulled FROM. Captured before the mutation — once
  // the item has moved it reports its DESTINATION, so there is no way to name
  // the drained queue after the fact. Only used for the "empty" copy below.
  const [lastSource, setLastSource] = createSignal<string | undefined>(undefined);
  // Set when onSelect fires with null, i.e. that move emptied the queue.
  const [emptiedQueue, setEmptiedQueue] = createSignal<string | undefined>(undefined);

  const selectedItem = () => items().find((i) => i.id === selected());

  // WHAT THE MOVE BUTTONS ACT ON. In select mode with a non-empty check set the
  // batch IS the check set; otherwise it's the single selected row. Checking
  // and selecting are independent, so the selected row is not implicitly part
  // of a batch it wasn't checked into.
  const moveBatch = (): string[] => {
    if (selectMode() && checked().size > 0) return [...checked()];
    const key = selected();
    return key ? [key] : [];
  };

  // A batch is already in `bucket` iff every member is — a mixed batch still
  // has work to do.
  const batchIsAllIn = (bucket: string) => {
    const batch = moveBatch();
    return (
      batch.length === 0 ||
      batch.every((id) => items().find((i) => i.id === id)?.bucket === bucket)
    );
  };

  // The button says what it will actually do — silently moving 5 rows from a
  // control labelled "Move to Categorized" is the kind of thing you only notice
  // after it happens.
  const moveLabel = (target: string) => {
    const n = moveBatch().length;
    return n > 1 ? `Move ${n} to ${target}` : `Move to ${target}`;
  };

  const moveTo = (bucket: string) => {
    const batch = new Set(moveBatch());
    if (batch.size === 0) return;
    // Captured before the mutation: a bulk action is one that CAME from the
    // check set, which the mutation below spends.
    const wasBulk = selectMode() && checked().size > 0;
    setLastSource(items().find((i) => i.id === selected())?.bucket);
    // ONE mutation for the whole batch — the queue diffs it as a single set of
    // transfers, so N rows animate together in one FLIP pass rather than N
    // competing ones, and the triage advance lands past ALL of them.
    setItems((rows) =>
      rows.map((r) => (batch.has(r.id) ? { ...r, bucket } : r)),
    );
    // The batch has left the queue being worked, so the checks that named it
    // are spent. Leaving them set would re-move the same rows on the next press.
    setChecked(new Set<string>());
    if (wasBulk) resumeTriage();
  };

  // A bulk action is a DETOUR. Once it lands, drop back to the default
  // one-at-a-time loop, parked at the top of the primary queue — otherwise you
  // are left in select mode with nothing checked and no selection, which is a
  // dead end you have to click your way out of.
  //
  // This lives here, not in the queue, for two reasons: the component cannot
  // leave select mode (the mode is on iff `checkedKeys` is passed, which is
  // consumer state), and sections are just an ordered list to it — WHICH one is
  // primary is application policy. Splitting the behavior across that seam would
  // put half of one decision in each place.
  //
  // ORDER MATTERS, deliberately. If the selected row was itself in the batch,
  // the queue's own per-row advance also fires (via onSelect) off the same
  // mutation. Calling this LAST in the handler gives the bulk reset the final
  // word, which is the intended precedence: a bulk action ends the detour and
  // returns you to the top of the queue, rather than dropping you wherever the
  // one-at-a-time advance would have gone.
  const resumeTriage = () => {
    setSelectMode(false);
    const top = items().find((i) => i.bucket === PRIMARY_BUCKET);
    setSelected(top?.id);
    // Same "queue empty" copy the component's own onSelect(null) drives — the
    // primary queue can perfectly well be empty after a bulk move into it.
    setEmptiedQueue(
      top ? undefined : BUCKETS.find((s) => s.key === PRIMARY_BUCKET)?.label,
    );
  };

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <NarrowStack>
      <WrappedClusterRow>
        <SmallPrimaryButton
          onClick={() => moveTo("done")}
          disabled={batchIsAllIn("done")}
        >
          {moveLabel("Categorized")}
        </SmallPrimaryButton>
        <SmallGhostButton
          onClick={() => moveTo("todo")}
          disabled={batchIsAllIn("todo")}
        >
          {moveLabel("Suggestions")}
        </SmallGhostButton>
        <SmallGhostButton
          onClick={() => moveTo("hold")}
          disabled={batchIsAllIn("hold")}
        >
          {moveLabel("In progress")}
        </SmallGhostButton>
        <SmallGhostButton onClick={() => setSelectMode((v) => !v)}>
          {selectMode() ? "Leave select mode" : "Enter select mode"}
        </SmallGhostButton>
      </WrappedClusterRow>

      <MutedBody>
        <Show
          when={selectedItem()}
          fallback={
            <Show
              when={emptiedQueue()}
              fallback="Nothing selected — click any row, or Categorized/In progress rows while in select mode."
            >
              {(label) => (
                <>
                  <strong>{label()} is empty.</strong> The last item left the
                  queue, so <code>onSelect</code> fired with <code>null</code>{" "}
                  and this demo cleared its selection — a real consumer closes
                  its detail panel here. Click any remaining row to carry on.
                </>
              )}
            </Show>
          }
        >
          {(item) => (
            <>
              Selected: <strong>{item().label}</strong> — its row shows only the
              inset accent bar, never a background fill, so it stays readable
              once the pointer moves away. Moving it plays the transfer
              animation, scrolls the arriving row into view, and advances this
              selection to the next item still waiting in the section it left,
              so you can process the queue without re-clicking.
            </>
          )}
        </Show>
      </MutedBody>

      <div class={props.demoClass}>
        <BucketQueue<QueueItem>
          buckets={BUCKETS}
          items={items()}
          bucketOf={(i) => i.bucket}
          keyOf={(i) => i.id}
          renderItem={props.renderItem}
          selectedKey={selected()}
          // `null` = the section being worked just drained. A real consumer
          // clears its detail panel here; this demo drops to the "queue empty"
          // copy below.
          onSelect={(k) => {
            setEmptiedQueue(
              k == null
                ? BUCKETS.find((s) => s.key === lastSource())?.label
                : undefined,
            );
            setSelected(k ?? undefined);
          }}
          focusedKey={focused()}
          onFocusChange={(k) => setFocused(k ?? undefined)}
          checkedKeys={selectMode() ? checked() : undefined}
          onToggleCheck={(k) => toggle(k)}
        />
      </div>

      <Show when={selectMode()}>
        <MutedBody>
          Checked ({checked().size}):{" "}
          <For each={[...checked()]} fallback="none — the Move buttons fall back to the selected row">
            {(k, idx) => (
              <>
                {idx() > 0 ? ", " : ""}
                {items().find((i) => i.id === k)?.label ?? k}
              </>
            )}
          </For>
          <Show when={checked().size > 1}>
            {" "}
            — the Move buttons now act on all {checked().size}, in one mutation.
          </Show>
        </MutedBody>
      </Show>
    </NarrowStack>
  );
}
