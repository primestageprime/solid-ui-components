import {
  type Component,
  type JSX,
  createSignal,
  For,
  Show,
} from "solid-js";
import {
  ProgressionQueue,
  type ProgressionSection,
} from "../../src/components/ProgressionQueue";
import {
  SmallPrimaryButton,
  SmallGhostButton,
} from "../../src/components/Button/variants";
import {
  SubsectionTitle,
  MutedBody,
  FadedNowrapSublabel,
} from "../../src/components/Text";
import { NarrowStack, WrappedClusterRow } from "../../src/components/Layout";

/* Demo item type — the same "transaction to categorize" framing as
 * SplitQueueList's showcase, now spread across THREE sections rather than a
 * resolved/unresolved pair. */
interface QueueItem {
  id: string;
  label: string;
  amount: string;
  bucket: string;
}

const SECTIONS: ProgressionSection[] = [
  { key: "done", label: "Categorized", tone: "success" },
  {
    key: "todo",
    label: "Suggestions",
    tone: "accent",
    selectable: true,
    emptyLabel: "All clear — every suggestion categorized",
  },
  { key: "hold", label: "In progress", tone: "muted", emptyLabel: "Nothing parked" },
];

const SEED: QueueItem[] = [
  { id: "t1", label: "AWS — invoice 8841", amount: "$1,204.00", bucket: "done" },
  { id: "t2", label: "Figma annual", amount: "$540.00", bucket: "done" },
  { id: "t3", label: "Coffee — Blue Bottle", amount: "$6.75", bucket: "todo" },
  { id: "t4", label: "Rent — April", amount: "$3,500.00", bucket: "todo" },
  { id: "t5", label: "Payroll — ACH", amount: "$22,910.12", bucket: "todo" },
  { id: "t6", label: "GitHub seats", amount: "$84.00", bucket: "todo" },
  { id: "t7", label: "Notion team", amount: "$120.00", bucket: "hold" },
  { id: "t8", label: "Legal retainer", amount: "$4,000.00", bucket: "hold" },
];

// Shared row renderer. A plain inline span, not a flex row: `.prog-queue__row`
// has no `display: flex` of its own (unlike SplitQueueList's `.sui-sql__row`,
// which does), so a full-width flex child here would wrap onto its own line
// below the select-mode checkbox rather than sitting beside it. Keeping the
// content inline is what coexists correctly with that checkbox span.
const renderItem = (i: QueueItem): JSX.Element => (
  <span>
    {i.label} <FadedNowrapSublabel>{i.amount}</FadedNowrapSublabel>
  </span>
);

// ── Select, move between sections, and select mode ──────────────────────────
// The headline interaction. Selecting a row shows its accent bar with NO
// background fill (readable even after the pointer leaves); the "Move to…"
// buttons change the selected item's `bucket`, which is the only thing that
// makes the queue animate a transfer — there is no separate resolve() call.
// Select mode is scoped to the "Suggestions" section only: toggling it on
// turns rows there into checkboxes while Categorized/In progress rows keep
// selecting on click.
function ProgressionQueueDemo() {
  const [items, setItems] = createSignal<QueueItem[]>(SEED);
  const [selected, setSelected] = createSignal<string | undefined>("t3");
  const [focused, setFocused] = createSignal<string | undefined>(undefined);
  const [selectMode, setSelectMode] = createSignal(false);
  const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set());

  const selectedItem = () => items().find((i) => i.id === selected());

  const moveTo = (bucket: string) => {
    const key = selected();
    if (!key) return;
    setItems((rows) => rows.map((r) => (r.id === key ? { ...r, bucket } : r)));
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
          disabled={!selected() || selectedItem()?.bucket === "done"}
        >
          Move to Categorized
        </SmallPrimaryButton>
        <SmallGhostButton
          onClick={() => moveTo("todo")}
          disabled={!selected() || selectedItem()?.bucket === "todo"}
        >
          Move to Suggestions
        </SmallGhostButton>
        <SmallGhostButton
          onClick={() => moveTo("hold")}
          disabled={!selected() || selectedItem()?.bucket === "hold"}
        >
          Move to In progress
        </SmallGhostButton>
        <SmallGhostButton onClick={() => setSelectMode((v) => !v)}>
          {selectMode() ? "Leave select mode" : "Enter select mode"}
        </SmallGhostButton>
      </WrappedClusterRow>

      <MutedBody>
        <Show
          when={selectedItem()}
          fallback="Nothing selected — click any row, or Categorized/In progress rows while in select mode."
        >
          {(item) => (
            <>
              Selected: <strong>{item().label}</strong> — its row shows only the
              inset accent bar, never a background fill, so it stays readable
              once the pointer moves away. Moving it plays the transfer
              animation and scrolls the arriving row into view.
            </>
          )}
        </Show>
      </MutedBody>

      <div class="progression-queue-demo">
        <ProgressionQueue<QueueItem>
          sections={SECTIONS}
          items={items()}
          bucketOf={(i) => i.bucket}
          keyOf={(i) => i.id}
          renderItem={renderItem}
          selectedKey={selected()}
          onSelect={setSelected}
          focusedKey={focused()}
          onFocusChange={(k) => setFocused(k ?? undefined)}
          checkedKeys={selectMode() ? checked() : undefined}
          onToggleCheck={(k) => toggle(k)}
        />
      </div>

      <Show when={selectMode()}>
        <MutedBody>
          Checked ({checked().size}):{" "}
          <For each={[...checked()]} fallback="none">
            {(k, idx) => (
              <>
                {idx() > 0 ? ", " : ""}
                {items().find((i) => i.id === k)?.label ?? k}
              </>
            )}
          </For>
        </MutedBody>
      </Show>
    </NarrowStack>
  );
}

export const ProgressionQueueShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ProgressionQueue — N-section progression bar</h2>
      <p class="text-meta">
        One queue component: N always-present sections, one flat{" "}
        <code>items</code> list bucketed by <code>bucketOf</code>, controlled
        selection / roving-focus keyboard navigation / checking, and a transfer
        animation played whenever an item's bucket changes — there is no
        separate resolve/unresolve call. Supersedes{" "}
        <code>SplitQueueList</code>. Full usage guide:{" "}
        <code>src/components/ProgressionQueue/README.md</code>.
      </p>

      <SubsectionTitle>
        Select, move between sections, and select mode
      </SubsectionTitle>
      <p class="text-meta">
        Click any row to select it, or use the buttons below to move the
        selection into a different section — <strong>Suggestions</strong> is
        the only section with <code>selectable: true</code>, so entering select
        mode there shows checkboxes while <strong>Categorized</strong> and{" "}
        <strong>In progress</strong> rows keep selecting on click even while
        select mode is on. Arrow keys / Home / End walk every interactive row
        across all three sections with no wrap; Tab lands on one roving stop.
      </p>
      <ProgressionQueueDemo />
    </div>
  );
};
