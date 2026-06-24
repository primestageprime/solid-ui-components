import { Component, createSignal, onCleanup } from "solid-js";
import { SplitQueueList } from "../../src/components/SplitQueueList";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import {
  SmallPrimaryButton,
  SmallGhostButton,
} from "../../src/components/Button/variants";

/* Demo item type — a small "transaction to categorize" record so the
 * resolved/unresolved framing reads naturally. */
interface QueueItem {
  id: string;
  label: string;
  amount: string;
}

/* A hand-written lead so the first rows read like a real ledger, then enough
 * synthetic vendor/amount rows to reach ≥100 so the length toggle (up to 100)
 * always has a full pool to slice from. */
const LEAD: { label: string; amount: string }[] = [
  { label: "AWS — invoice 8841", amount: "$1,204.00" },
  { label: "Stripe payout", amount: "$8,320.55" },
  { label: "Office rent — June", amount: "$3,500.00" },
  { label: "Figma annual", amount: "$540.00" },
  { label: "Payroll — biweekly", amount: "$22,910.12" },
  { label: "GitHub seats", amount: "$84.00" },
  { label: "Notion team", amount: "$120.00" },
  { label: "Travel — SFO conf", amount: "$1,860.40" },
  { label: "Refund — vendor X", amount: "-$220.00" },
  { label: "Cloudflare", amount: "$20.00" },
  { label: "Legal retainer", amount: "$4,000.00" },
  { label: "Coffee — team", amount: "$96.75" },
];

const VENDORS = [
  "Datadog",
  "Vercel",
  "Linear",
  "Slack",
  "Zoom",
  "HubSpot",
  "Twilio",
  "Sentry",
  "PagerDuty",
  "Auth0",
  "Snowflake",
  "Postmark",
  "Brex",
  "Gusto",
  "Carta",
];

// Pool of ≥100 demo items; the first dozen are the curated lead, the rest are
// deterministic synthetic rows (no randomness so the gallery is stable).
const POOL: QueueItem[] = Array.from({ length: 110 }, (_, i) => {
  const id = `t${String(i + 1).padStart(3, "0")}`;
  if (i < LEAD.length) return { id, ...LEAD[i] };
  const vendor = VENDORS[i % VENDORS.length];
  const amount = `$${(((i * 37) % 900) + 50).toLocaleString()}.00`;
  return { id, label: `${vendor} — #${1000 + i}`, amount };
});

const LENGTH_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "6", label: "6" },
  { value: "20", label: "20" },
  { value: "100", label: "100" },
];
const DEFAULT_COUNT = 6;

const SPEED_OPTIONS = [
  { value: "400", label: "400ms" },
  { value: "800", label: "800ms" },
  { value: "1500", label: "1500ms" },
];
const DEFAULT_SPEED = 800;

// Tall, easy-to-watch cards (3× the library default 40px). The container is
// sized so the 3-row top cap (3 * CARD_H + header) plus a useful bottom area
// fit; Short shows the same model with less room.
const CARD_H = 120;

function QueueDemo(props: { height: number }) {
  const [count, setCount] = createSignal(DEFAULT_COUNT);
  const seed = () => POOL.slice(0, count());

  const [resolved, setResolved] = createSignal<QueueItem[]>([]);
  const [unresolved, setUnresolved] = createSignal<QueueItem[]>(seed());
  const [focused, setFocused] = createSignal<string | null>(seed()[0]?.id ?? null);
  const [auto, setAuto] = createSignal(false);
  const [speed, setSpeed] = createSignal(DEFAULT_SPEED);

  const resolveKey = (key: string) => {
    const item = unresolved().find((i) => i.id === key);
    if (!item) return;
    // The consumer just swaps the two arrays — SUI owns the animation.
    setUnresolved((u) => u.filter((i) => i.id !== key));
    setResolved((r) => [...r, item]);
  };

  const resolveNext = () => {
    // Resolve the focused item, but only if it's still in the unresolved list;
    // otherwise fall back to the head. This guarantees forward progress even if
    // `focused` lags the data by a tick, so the queue always drains.
    const list = unresolved();
    const f = focused();
    const next = (f && list.some((i) => i.id === f) ? f : list[0]?.id) ?? null;
    if (next) resolveKey(next);
  };

  // Regenerate the queue to N unresolved items (resolved empty, focus at top).
  const loadCount = (n: number) => {
    if (timer) clearTimeout(timer);
    setAuto(false);
    setCount(n);
    setResolved([]);
    setUnresolved(seed());
    setFocused(seed()[0]?.id ?? null);
  };

  const reset = () => loadCount(count());

  // Auto-play loop.
  let timer: number | undefined;
  const tick = () => {
    if (!auto()) return;
    if (unresolved().length === 0) {
      setAuto(false);
      return;
    }
    resolveNext();
    // Pace auto-play a touch slower than the slide so each animation finishes
    // before the next resolve starts.
    timer = window.setTimeout(tick, speed() + 250);
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
      <div style={{ display: "flex", gap: "16px", "align-items": "center", "flex-wrap": "wrap" }}>
        <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
          <span class="text-meta">Items</span>
          <SegmentedControl
            options={LENGTH_OPTIONS}
            value={String(count())}
            onValueChange={(v) => loadCount(Number(v))}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
          <span class="text-meta">Speed</span>
          <SegmentedControl
            options={SPEED_OPTIONS}
            value={String(speed())}
            onValueChange={(v) => setSpeed(Number(v))}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", "align-items": "center", "flex-wrap": "wrap" }}>
        <SmallPrimaryButton onClick={resolveNext} disabled={unresolved().length === 0}>
          Resolve next ▸
        </SmallPrimaryButton>
        <SmallGhostButton onClick={toggleAuto} disabled={unresolved().length === 0 && !auto()}>
          {auto() ? "Pause" : "Auto-play"}
        </SmallGhostButton>
        <SmallGhostButton onClick={reset}>Reset</SmallGhostButton>
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
          rowHeight={CARD_H}
          animationMs={speed()}
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
        Two stacked lists sharing a fixed height. Top = categorized (solid accent
        border + ✓), bottom = to-categorize (dashed muted border + ▸ focus). The
        top is content-driven between a 1-row floor and a 3-row cap; at 4+ it
        caps and scrolls so the newest sits at the seam. The bottom takes the
        remaining space and scrolls when overfull; when the bottom is short it
        shrinks and the top absorbs the slack. Resolving a row (button or click)
        FLIP-slides it up across the seam, repainting from unresolved to resolved
        styling. Honors <code>prefers-reduced-motion</code>.
      </p>
      <p class="text-meta">
        Use the <strong>Items</strong> toggle to see the layout at every length:
        <strong> 0</strong> (empty → "all clear" strip, top fills),
        <strong> 1</strong> (single), <strong>6</strong> (fits),
        <strong> 20</strong> (bottom scrolls), <strong>100</strong> (long
        scroll). Each height shows the same toggle so the proportion behavior is
        visible at each length.
      </p>

      <div style={{ display: "flex", gap: "40px", "flex-wrap": "wrap" }}>
        <div>
          <h3>Tall (760px) — top caps at 3, newest at the seam</h3>
          <p class="text-meta">
            Resolve a few: the top fits 1→2→3 by content, then caps at 3 and
            scrolls so the newest categorized row sits at the seam. Drain the
            bottom and the top absorbs the freed slack (grows past 3).
          </p>
          <QueueDemo height={760} />
        </div>

        <div>
          <h3>Short (520px) — same model, less room</h3>
          <p class="text-meta">
            The 1-row floor / 3-row cap and slack-absorption hold at a smaller
            height; drain the bottom to the "all clear" strip.
          </p>
          <QueueDemo height={520} />
        </div>
      </div>
    </div>
  );
};
