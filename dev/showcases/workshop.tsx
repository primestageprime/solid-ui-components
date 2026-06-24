import { type Component, type JSX, createSignal, onCleanup } from "solid-js";
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

/* Workshop-only annotation: a relatively-positioned wrapper that drops small
 * muted N/E/W/S compass labels centered on each edge of its child, so we share a
 * vocabulary for the enter animation (N = top, S = bottom, E = right, W = left).
 * Dev-harness overlay only — never touches the SplitQueueList component. */
function EdgeLabels(props: {
  children: JSX.Element;
  /** Fix the overlay to this pixel height (e.g. a card row) so N/S land on the
   * real top/bottom edges rather than on the centered content's small box. */
  rowH?: number;
}): JSX.Element {
  const cap: JSX.CSSProperties = {
    position: "absolute",
    "font-family": "var(--sui-font-mono, monospace)",
    "font-size": "10px",
    "font-weight": "700",
    color: "var(--sui-text-muted)",
    "letter-spacing": "0.05em",
    "pointer-events": "none",
    "z-index": "10",
    "line-height": "1",
  };
  return (
    <div
      style={{
        position: "relative",
        ...(props.rowH
          ? {
              // Center the card content vertically inside a full-row-height box
              // so the absolute N/S/E/W labels sit on the row's true edges.
              height: `${props.rowH}px`,
              width: "100%",
              display: "flex",
              "align-items": "center",
            }
          : {}),
      }}
    >
      {props.children}
      <span style={{ ...cap, top: "1px", left: "50%", transform: "translateX(-50%)" }}>N</span>
      <span style={{ ...cap, bottom: "1px", left: "50%", transform: "translateX(-50%)" }}>S</span>
      <span style={{ ...cap, right: "2px", top: "50%", transform: "translateY(-50%)" }}>E</span>
      <span style={{ ...cap, left: "2px", top: "50%", transform: "translateY(-50%)" }}>W</span>
    </div>
  );
}

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

  // Shared row renderer used by both columns.
  const renderItem = (i: QueueItem): JSX.Element => (
    <span style={{ display: "flex", "justify-content": "space-between", gap: "8px" }}>
      <span style={{ overflow: "hidden", "text-overflow": "ellipsis" }}>{i.label}</span>
      <span style={{ "font-variant-numeric": "tabular-nums", opacity: 0.8 }}>{i.amount}</span>
    </span>
  );

  // Top-only column renderer: annotate the FIRST item's card with the N/E/W/S
  // compass labels (the card fills its row, so the labels sit on the row edges).
  const renderItemTopOnly = (i: QueueItem): JSX.Element =>
    i.id === ITEMS[0].id ? (
      <EdgeLabels rowH={CARD_H}>{renderItem(i)}</EdgeLabels>
    ) : (
      renderItem(i)
    );

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
        (0 categorized, 10 to categorize). Two columns share the same state and
        controls: <strong>Full</strong> (both panels) and <strong>Top panel
        only</strong> (just the categorized list, full height) — resolving plays
        the enter animation in both at once so the categorized-panel behavior can
        be watched in isolation. Drag the <strong>Animation duration</strong> knob
        to scrub the speed live (honors <code>prefers-reduced-motion</code>).
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

      {/* Two columns sharing the SAME state + controls: left = the full
          component, right = ONLY the categorized panel (topOnly). Resolving
          plays the enter animation in BOTH at once, so the categorized-panel
          behavior can be watched in isolation. */}
      <div style={{ display: "flex", gap: "40px", "flex-wrap": "wrap" }}>
        <div style={{ width: "340px" }}>
          <div class="text-meta" style={{ "margin-bottom": "6px" }}>
            Full
          </div>
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
            renderItem={renderItem}
          />
        </div>

        <div style={{ width: "340px" }}>
          <div class="text-meta" style={{ "margin-bottom": "6px" }}>
            Top panel only (N=top · S=bottom · E=right · W=left)
          </div>
          {/* Panel container annotated with N/E/W/S on its four edges. */}
          <EdgeLabels>
            <SplitQueueList<QueueItem>
              topOnly
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
              renderItem={renderItemTopOnly}
            />
          </EdgeLabels>
        </div>
      </div>
    </div>
  );
};
