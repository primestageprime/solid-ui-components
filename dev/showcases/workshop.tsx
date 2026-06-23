import { type Component, createSignal, onCleanup } from "solid-js";
import { SectionTitle } from "../../src/components/Text";
import { SplitQueueList } from "../../src/components/SplitQueueList";
import {
  SmallPrimaryButton,
  SmallGhostButton,
} from "../../src/components/Button/variants";

// Workshop bench — current prototype: the SplitQueueList resolve-animation
// harness. Tall (120px) cards and a continuous duration knob so the FLIP +
// seam-repaint slide is easy to watch. The component itself already lives in
// src/components/SplitQueueList; this bench is just the iteration surface for
// its motion. Once the shape is settled, `/promote` clears the bench.

interface QueueItem {
  id: string;
  label: string;
  amount: string;
}

// Exactly 10 fixed demo transactions.
const ITEMS: QueueItem[] = [
  { id: "a01", label: "AWS — invoice 8841", amount: "$1,204.00" },
  { id: "a02", label: "Stripe payout", amount: "$8,320.55" },
  { id: "a03", label: "Office rent — June", amount: "$3,500.00" },
  { id: "a04", label: "Figma annual", amount: "$540.00" },
  { id: "a05", label: "Payroll — biweekly", amount: "$22,910.12" },
  { id: "a06", label: "GitHub seats", amount: "$84.00" },
  { id: "a07", label: "Notion team", amount: "$120.00" },
  { id: "a08", label: "Travel — SFO conf", amount: "$1,860.40" },
  { id: "a09", label: "Refund — vendor X", amount: "-$220.00" },
  { id: "a10", label: "Cloudflare", amount: "$20.00" },
];

// Tall cards (3× the library default 40px) so the motion is easy to watch.
const CARD_H = 120;
const CONTAINER_H = 760;

export const WorkshopShowcase: Component = () => {
  const [resolved, setResolved] = createSignal<QueueItem[]>([]);
  const [unresolved, setUnresolved] = createSignal<QueueItem[]>([...ITEMS]);
  const [focused, setFocused] = createSignal<string | null>(ITEMS[0].id);
  const [duration, setDuration] = createSignal(800); // ms — bound to animationMs
  const [auto, setAuto] = createSignal(false);

  const resolveKey = (key: string) => {
    const item = unresolved().find((i) => i.id === key);
    if (!item) return;
    // The consumer just swaps the two arrays — SUI owns the animation.
    setUnresolved((u) => u.filter((i) => i.id !== key));
    setResolved((r) => [...r, item]);
  };

  const resolveNext = () => {
    const list = unresolved();
    const f = focused();
    const next = (f && list.some((i) => i.id === f) ? f : list[0]?.id) ?? null;
    if (next) resolveKey(next);
  };

  // Empty start state: nothing categorized, all 10 to-categorize, focus on the
  // first unresolved row.
  const reset = () => {
    if (timer) clearTimeout(timer);
    setAuto(false);
    setResolved([]);
    setUnresolved([...ITEMS]);
    setFocused(ITEMS[0].id);
  };

  // Auto-play, paced a touch slower than the slide so each finishes first.
  let timer: number | undefined;
  const tick = () => {
    if (!auto()) return;
    if (unresolved().length === 0) {
      setAuto(false);
      return;
    }
    resolveNext();
    timer = window.setTimeout(tick, duration() + 250);
  };
  const toggleAuto = () => {
    const next = !auto();
    setAuto(next);
    if (next) timer = window.setTimeout(tick, 200);
    else if (timer) clearTimeout(timer);
  };
  onCleanup(() => timer && clearTimeout(timer));

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop — SplitQueueList animation</SectionTitle>
      <p
        style={{
          "font-size": "13px",
          color: "var(--sui-text-secondary)",
          margin: "12px 0 16px",
          "max-width": "72ch",
        }}
      >
        Iteration surface for the SplitQueueList resolve animation. Tall (120px)
        cards, a fixed queue of 10 transactions that starts <strong>empty</strong>{" "}
        (0 categorized, 10 to categorize). Resolving a row FLIP-slides it up
        across the seam and repaints from unresolved to resolved styling. Drag the{" "}
        <strong>Animation duration</strong> knob to scrub the slide speed live
        (honors <code>prefers-reduced-motion</code> — instant when reduced).
      </p>

      <div
        style={{
          display: "flex",
          "align-items": "center",
          gap: "12px",
          "flex-wrap": "wrap",
          "margin-bottom": "8px",
        }}
      >
        <span class="text-meta">Animation duration</span>
        <input
          type="range"
          min={100}
          max={2000}
          step={50}
          value={duration()}
          onInput={(e) => setDuration(Number(e.currentTarget.value))}
          style={{ width: "260px", "accent-color": "var(--sui-accent)" }}
          aria-label="Animation duration in milliseconds"
        />
        <span
          class="text-meta"
          style={{ "font-variant-numeric": "tabular-nums", "min-width": "5ch" }}
        >
          {duration()} ms
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          "align-items": "center",
          "flex-wrap": "wrap",
          "margin-bottom": "8px",
        }}
      >
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

      <div style={{ width: "340px" }}>
        <SplitQueueList<QueueItem>
          resolved={resolved()}
          unresolved={unresolved()}
          keyOf={(i) => i.id}
          focusedKey={focused() ?? undefined}
          onFocusChange={setFocused}
          onResolve={resolveKey}
          height={CONTAINER_H}
          rowHeight={CARD_H}
          animationMs={duration()}
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
};
