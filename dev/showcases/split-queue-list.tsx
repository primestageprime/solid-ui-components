import { Component, createSignal, onCleanup } from "solid-js";
import { SplitQueueList } from "../../src/components/SplitQueueList";

/* Demo item type — a small "transaction to categorize" record so the
 * resolved/unresolved framing reads naturally. */
interface QueueItem {
  id: string;
  label: string;
  amount: string;
}

const SEED: QueueItem[] = [
  { id: "t01", label: "AWS — invoice 8841", amount: "$1,204.00" },
  { id: "t02", label: "Stripe payout", amount: "$8,320.55" },
  { id: "t03", label: "Office rent — June", amount: "$3,500.00" },
  { id: "t04", label: "Figma annual", amount: "$540.00" },
  { id: "t05", label: "Payroll — biweekly", amount: "$22,910.12" },
  { id: "t06", label: "GitHub seats", amount: "$84.00" },
  { id: "t07", label: "Notion team", amount: "$120.00" },
  { id: "t08", label: "Travel — SFO conf", amount: "$1,860.40" },
  { id: "t09", label: "Refund — vendor X", amount: "-$220.00" },
  { id: "t10", label: "Cloudflare", amount: "$20.00" },
  { id: "t11", label: "Legal retainer", amount: "$4,000.00" },
  { id: "t12", label: "Coffee — team", amount: "$96.75" },
];

function QueueDemo(props: { height: number; topMinRows?: number }) {
  const [resolved, setResolved] = createSignal<QueueItem[]>([]);
  const [unresolved, setUnresolved] = createSignal<QueueItem[]>([...SEED]);
  const [focused, setFocused] = createSignal<string | null>(SEED[0].id);
  const [auto, setAuto] = createSignal(false);

  const resolveKey = (key: string) => {
    const item = unresolved().find((i) => i.id === key);
    if (!item) return;
    // The consumer just swaps the two arrays — SUI owns the animation.
    setUnresolved((u) => u.filter((i) => i.id !== key));
    setResolved((r) => [...r, item]);
  };

  const resolveNext = () => {
    const next = focused() ?? unresolved()[0]?.id;
    if (next) resolveKey(next);
  };

  const reset = () => {
    setResolved([]);
    setUnresolved([...SEED]);
    setFocused(SEED[0].id);
  };

  // Auto-play loop.
  let timer: number | undefined;
  const tick = () => {
    if (!auto()) return;
    if (unresolved().length === 0) {
      setAuto(false);
      return;
    }
    resolveNext();
    timer = window.setTimeout(tick, 900);
  };
  const toggleAuto = () => {
    const next = !auto();
    setAuto(next);
    if (next) timer = window.setTimeout(tick, 200);
    else if (timer) clearTimeout(timer);
  };
  onCleanup(() => timer && clearTimeout(timer));

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", "flex-wrap": "wrap" }}>
        <button onClick={resolveNext} disabled={unresolved().length === 0}>
          Resolve next ▸
        </button>
        <button onClick={toggleAuto}>{auto() ? "Pause" : "Auto-play"}</button>
        <button onClick={reset}>Reset</button>
        <span class="text-meta" style={{ "align-self": "center" }}>
          {resolved().length} resolved · {unresolved().length} left
        </span>
      </div>
      <div style={{ width: "320px" }}>
        <SplitQueueList<QueueItem>
          resolved={resolved()}
          unresolved={unresolved()}
          keyOf={(i) => i.id}
          focusedKey={focused() ?? undefined}
          onFocusChange={setFocused}
          onResolve={resolveKey}
          height={props.height}
          topMinRows={props.topMinRows}
          resolvedLabel="Categorized"
          unresolvedLabel="To categorize"
          allClearLabel="All clear — every transaction categorized"
          renderItem={(i) => (
            <span style={{ display: "flex", "justify-content": "space-between", gap: "8px" }}>
              <span style={{ overflow: "hidden", "text-overflow": "ellipsis" }}>{i.label}</span>
              <span style={{ "font-variant-numeric": "tabular-nums", opacity: 0.8 }}>{i.amount}</span>
            </span>
          )}
        />
      </div>
    </div>
  );
}

export const SplitQueueListShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>SplitQueueList — linked processing queue</h2>
      <p class="text-meta">
        Two stacked lists sharing a fixed height. Top = resolved (solid accent
        border + ✓), bottom = unresolved (dashed muted border + ▸ focus). The
        bottom has height priority; the top keeps a 3-row floor and absorbs
        slack when the bottom is short. Resolving a row (button or click)
        FLIP-slides it up across the seam, repainting from unresolved to
        resolved styling. Honors <code>prefers-reduced-motion</code>.
      </p>

      <div style={{ display: "flex", gap: "40px", "flex-wrap": "wrap" }}>
        <div>
          <h3>Tall (480px) — bottom fills, top scrolls past 3</h3>
          <p class="text-meta">
            Resolve a few: the top list grows toward absorbing slack as the
            bottom shrinks, and once &gt;3 are resolved the top scrolls so the
            newest sits at the seam.
          </p>
          <QueueDemo height={480} />
        </div>

        <div>
          <h3>Short (260px) — 3-row floor + slack</h3>
          <p class="text-meta">
            Drain the bottom to watch the top grow past 3 rows, then collapse to
            the "all clear" strip when empty.
          </p>
          <QueueDemo height={260} />
        </div>
      </div>
    </div>
  );
};
