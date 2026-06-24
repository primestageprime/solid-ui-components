import {
  type Component,
  type JSX,
  createSignal,
  createMemo,
  Show,
  onCleanup,
} from "solid-js";
import { SectionTitle, TextTitle, MutedBody } from "../../src/components/Text";
import { CardSurface } from "../../src/components/Surface";
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
  // ONE "current card" drives everything: the orange focus highlight, the
  // selection, and the detail panel. Selecting moves the current card;
  // resolving advances it to the next to-categorize head; unresolving keeps it
  // on the returning card. focusedKey lights the to-categorize current orange;
  // selectedKey shows the ring only when the current card is on the done side
  // (where orange doesn't apply), so the two indicators never double up.
  const [current, setCurrent] = createSignal<string | null>(ITEMS[0].id);
  const [duration, setDuration] = createSignal(800); // ms — bound to animationMs
  const [auto, setAuto] = createSignal(false);

  const currentItem = createMemo(() => {
    const id = current();
    if (!id) return null;
    return (
      resolved().find((i) => i.id === id) ??
      unresolved().find((i) => i.id === id) ??
      null
    );
  });
  const currentIsResolved = createMemo(() => {
    const id = current();
    return !!id && resolved().some((i) => i.id === id);
  });

  const resolveKey = (key: string) => {
    const item = unresolved().find((i) => i.id === key);
    if (!item) return;
    // The consumer just swaps the two arrays — SUI owns the animation.
    // Forward = remove from unresolved, append to resolved.
    setUnresolved((u) => u.filter((i) => i.id !== key));
    setResolved((r) => [...r, item]);
  };

  // Stepper: resolve the HEAD (top of the bottom list), independent of which
  // card is currently selected. Focus advances to the new head via onFocusChange.
  const resolveNext = () => {
    const head = unresolved()[0]?.id;
    if (head) resolveKey(head);
  };

  // Let the instant reorder PAINT before the array swap, so SUI captures the
  // pre-swap rect at the head (resolve) / tail (unresolve) and animates from
  // there — "sort to the seam, then run the animation".
  const rafThen = (fn: () => void) => {
    if (typeof requestAnimationFrame === "function")
      requestAnimationFrame(() => requestAnimationFrame(fn));
    else setTimeout(fn, 0);
  };

  // Detail-panel Resolve: sort the card to the HEAD of to-categorize (instant)
  // if it isn't already, then swap it across — so the exit always runs from the
  // head, matching the component's forward animation.
  const resolveSelected = (key: string) => {
    if (!unresolved().some((i) => i.id === key)) return;
    setCurrent(key);
    if (unresolved()[0]?.id === key) {
      resolveKey(key);
      return;
    }
    setUnresolved((u) => {
      const item = u.find((i) => i.id === key)!;
      return [item, ...u.filter((i) => i.id !== key)];
    });
    rafThen(() => resolveKey(key));
  };

  // Detail-panel Unresolve: sort the card to the TAIL of done (instant) if it
  // isn't already, then swap it back — landing at the to-categorize head — so
  // the reverse animation always runs from the done tail (mirror of resolve).
  const unresolveSelected = (key: string) => {
    if (!resolved().some((i) => i.id === key)) return;
    const doReverse = () => {
      const item = resolved().find((i) => i.id === key);
      if (!item) return;
      setResolved((r) => r.filter((i) => i.id !== key));
      setUnresolved((u) => [item, ...u]);
      // Retain focus on the unresolved card — it lands at the to-categorize head.
      setCurrent(item.id);
    };
    if (resolved()[resolved().length - 1]?.id === key) {
      doReverse();
      return;
    }
    setResolved((r) => {
      const item = r.find((i) => i.id === key)!;
      return [...r.filter((i) => i.id !== key), item];
    });
    rafThen(doReverse);
  };

  // Step BACKWARD: un-resolve the most-recently categorized card, putting it
  // back at the HEAD of the to-categorize list and focusing it — so the next
  // Resolve re-plays the same enter on the same card. Pauses auto-play first.
  const prev = () => {
    setAuto(false);
    if (timer) clearTimeout(timer);
    const r = resolved();
    const last = r[r.length - 1];
    if (!last) return;
    setResolved((rs) => rs.slice(0, -1));
    setUnresolved((u) => [last, ...u]);
    setCurrent(last.id);
  };

  // Empty start state: nothing categorized, all 10 to-categorize, focus on the
  // first unresolved row.
  const reset = () => {
    if (timer) clearTimeout(timer);
    setAuto(false);
    setResolved([]);
    setUnresolved([...ITEMS]);
    setCurrent(ITEMS[0].id);
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
        (0 categorized, 10 to categorize). Click any card (either panel) to select
        it; the detail panel's <strong>Resolve ▸</strong> / <strong>◂ Unresolve</strong>{" "}
        sorts it to the seam and runs the animation. <strong>Resolve next ▸</strong>{" "}
        / <strong>◂ Prev</strong> step through the head. Drag the{" "}
        <strong>Animation duration</strong> knob to scrub the speed live (honors{" "}
        <code>prefers-reduced-motion</code>).
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
        <SmallGhostButton onClick={prev} disabled={resolved().length === 0}>
          ◂ Prev
        </SmallGhostButton>
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

      <div style={{ display: "flex", gap: "24px", "align-items": "flex-start" }}>
        <div style={{ width: "340px" }}>
          <SplitQueueList<QueueItem>
            resolved={resolved()}
            unresolved={unresolved()}
            keyOf={(i) => i.id}
            focusedKey={current() ?? undefined}
            onFocusChange={setCurrent}
            // Ring only when the current card is on the done side — to-categorize
            // cards are indicated by the orange focus, so the two never double up.
            selectedKey={currentIsResolved() ? (current() ?? undefined) : undefined}
            onSelect={setCurrent}
            height={CONTAINER_H}
            rowHeight={CARD_H}
            animationMs={duration()}
            resolvedLabel="Categorized"
            unresolvedLabel="To categorize"
            allClearLabel="All clear — every transaction categorized"
            renderItem={renderItem}
          />
        </div>

        {/* Detail panel — consumer-composed (the component only emits
            selection). Shows the current card's name + a Resolve button for
            to-categorize cards / Unresolve for done ones. */}
        <div style={{ width: "260px", position: "sticky", top: "16px" }}>
          <CardSurface direction="column" gap="md">
            <Show
              when={currentItem()}
              fallback={<MutedBody>Select a card to see its details.</MutedBody>}
            >
              {(item) => (
                <>
                  <TextTitle as="h3">{item().label}</TextTitle>
                  <MutedBody>
                    {item().amount} ·{" "}
                    {currentIsResolved() ? "Categorized" : "To categorize"}
                  </MutedBody>
                  <Show
                    when={currentIsResolved()}
                    fallback={
                      <SmallPrimaryButton onClick={() => resolveSelected(item().id)}>
                        Resolve ▸
                      </SmallPrimaryButton>
                    }
                  >
                    <SmallGhostButton onClick={() => unresolveSelected(item().id)}>
                      ◂ Unresolve
                    </SmallGhostButton>
                  </Show>
                </>
              )}
            </Show>
          </CardSurface>
        </div>
      </div>
    </div>
  );
};
