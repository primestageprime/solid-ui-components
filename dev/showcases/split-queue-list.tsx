import {
  type Component,
  type JSX,
  createSignal,
  createMemo,
  Show,
  onCleanup,
} from "solid-js";
import { SplitQueueList } from "../../src/components/SplitQueueList";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import {
  SmallPrimaryButton,
  SmallGhostButton,
} from "../../src/components/Button/variants";
import {
  SubsectionTitle,
  MutedBody,
  EllipsizedTitle,
  FadedNowrapSublabel,
} from "../../src/components/Text";
import {
  NarrowStack,
  ClusterRow,
  TopClusterRow,
  WrappedClusterRow,
  SpreadRow,
} from "../../src/components/Layout";
import { createSurface } from "../../src/components/Surface";

// Consumer-composed detail panel — a column card with md gap. App-specific
// composition curried at module top so no visual config sits at the call site.
const DetailCard = createSurface({
  padding: "md",
  radius: "md",
  direction: "column",
  gap: "md",
});

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

// Shared row renderer: label left, right-aligned tabular amount.
const renderItem = (i: QueueItem): JSX.Element => (
  <SpreadRow>
    <EllipsizedTitle>{i.label}</EllipsizedTitle>
    <FadedNowrapSublabel>{i.amount}</FadedNowrapSublabel>
  </SpreadRow>
);

// ── Selection + detail panel + resolve/unresolve ────────────────────────────
// The headline interaction. ONE "current card" drives the orange focus, the
// selection ring, and a CONSUMER-COMPOSED detail panel. Clicking a card selects
// it (no auto-resolve); the panel's Resolve/Unresolve mutate the two arrays and
// SUI animates the transition. Resolve sorts the card to the to-categorize HEAD
// first, Unresolve sorts it to the done TAIL first ("sort to the seam, then
// run the animation"), so forward and reverse are exact mirrors. This is the
// reference wiring for the Thorcasting Configure accept-flow.
function SelectionDemo() {
  const ITEMS = POOL.slice(0, 10);
  const [resolved, setResolved] = createSignal<QueueItem[]>([]);
  const [unresolved, setUnresolved] = createSignal<QueueItem[]>([...ITEMS]);
  const [current, setCurrent] = createSignal<string | null>(ITEMS[0].id);
  const [speed, setSpeed] = createSignal(DEFAULT_SPEED);
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
  const currentIsResolved = createMemo(
    () => !!current() && resolved().some((i) => i.id === current()),
  );

  // Forward swap = remove from unresolved, append to resolved. SUI owns the anim.
  const resolveKey = (key: string) => {
    const item = unresolved().find((i) => i.id === key);
    if (!item) return;
    setUnresolved((u) => u.filter((i) => i.id !== key));
    setResolved((r) => [...r, item]);
  };
  const resolveNext = () => {
    const head = unresolved()[0]?.id;
    if (head) resolveKey(head);
  };

  // Let the instant reorder PAINT before the swap, so SUI captures the pre-swap
  // rect at the seam and animates from there.
  const rafThen = (fn: () => void) => {
    if (typeof requestAnimationFrame === "function")
      requestAnimationFrame(() => requestAnimationFrame(fn));
    else setTimeout(fn, 0);
  };

  const resolveSelected = (key: string) => {
    if (!unresolved().some((i) => i.id === key)) return;
    setCurrent(key);
    if (unresolved()[0]?.id === key) return resolveKey(key);
    setUnresolved((u) => {
      const item = u.find((i) => i.id === key)!;
      return [item, ...u.filter((i) => i.id !== key)];
    });
    rafThen(() => resolveKey(key));
  };

  const unresolveSelected = (key: string) => {
    if (!resolved().some((i) => i.id === key)) return;
    const doReverse = () => {
      const item = resolved().find((i) => i.id === key);
      if (!item) return;
      setResolved((r) => r.filter((i) => i.id !== key));
      setUnresolved((u) => [item, ...u]); // lands at the to-categorize head
      setCurrent(item.id);
    };
    if (resolved()[resolved().length - 1]?.id === key) return doReverse();
    setResolved((r) => {
      const item = r.find((i) => i.id === key)!;
      return [...r.filter((i) => i.id !== key), item];
    });
    rafThen(doReverse);
  };

  const prev = () => {
    setAuto(false);
    if (timer) clearTimeout(timer);
    const last = resolved()[resolved().length - 1];
    if (!last) return;
    setResolved((rs) => rs.slice(0, -1));
    setUnresolved((u) => [last, ...u]);
    setCurrent(last.id);
  };

  const reset = () => {
    if (timer) clearTimeout(timer);
    setAuto(false);
    setResolved([]);
    setUnresolved([...ITEMS]);
    setCurrent(ITEMS[0].id);
  };

  let timer: number | undefined;
  const tick = () => {
    if (!auto()) return;
    if (unresolved().length === 0) return setAuto(false);
    resolveNext();
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
    <NarrowStack>
      <WrappedClusterRow>
        <SmallGhostButton onClick={prev} disabled={resolved().length === 0}>
          ◂ Prev
        </SmallGhostButton>
        <SmallPrimaryButton
          onClick={resolveNext}
          disabled={unresolved().length === 0}
        >
          Resolve next ▸
        </SmallPrimaryButton>
        <SmallGhostButton
          onClick={toggleAuto}
          disabled={unresolved().length === 0 && !auto()}
        >
          {auto() ? "Pause" : "Auto-play"}
        </SmallGhostButton>
        <SmallGhostButton onClick={reset}>Reset</SmallGhostButton>
        <span class="text-meta">Speed</span>
        <SegmentedControl
          options={SPEED_OPTIONS}
          value={String(speed())}
          onValueChange={(v) => setSpeed(Number(v))}
        />
        <span class="text-meta">
          {resolved().length} resolved · {unresolved().length} left
        </span>
      </WrappedClusterRow>

      <TopClusterRow>
        <div style={{ width: "340px" }}>
          <SplitQueueList<QueueItem>
            resolved={resolved()}
            unresolved={unresolved()}
            keyOf={(i) => i.id}
            focusedKey={current() ?? undefined}
            onFocusChange={setCurrent}
            // Ring only when the current card is on the done side — to-categorize
            // cards are indicated by the orange focus, so the two never double up.
            selectedKey={
              currentIsResolved() ? (current() ?? undefined) : undefined
            }
            onSelect={setCurrent}
            height={600}
            rowHeight={CARD_H}
            animationMs={speed()}
            resolvedLabel="Categorized"
            unresolvedLabel="To categorize"
            allClearLabel="All clear — every transaction categorized"
            renderItem={renderItem}
          />
        </div>

        {/* Detail panel — CONSUMER-composed; the component only emits selection. */}
        <div style={{ width: "260px", position: "sticky", top: "16px" }}>
          <DetailCard>
            <Show
              when={currentItem()}
              fallback={
                <MutedBody>Select a card to see its details.</MutedBody>
              }
            >
              {(item) => (
                <>
                  <SubsectionTitle>{item().label}</SubsectionTitle>
                  <MutedBody>
                    {item().amount} ·{" "}
                    {currentIsResolved() ? "Categorized" : "To categorize"}
                  </MutedBody>
                  <Show
                    when={currentIsResolved()}
                    fallback={
                      <SmallPrimaryButton
                        onClick={() => resolveSelected(item().id)}
                      >
                        Resolve ▸
                      </SmallPrimaryButton>
                    }
                  >
                    <SmallGhostButton
                      onClick={() => unresolveSelected(item().id)}
                    >
                      ◂ Unresolve
                    </SmallGhostButton>
                  </Show>
                </>
              )}
            </Show>
          </DetailCard>
        </div>
      </TopClusterRow>
    </NarrowStack>
  );
}

// ── Layout at every length / height ─────────────────────────────────────────
// Length + speed toggles + auto-play; demonstrates the content-driven top
// (1-row floor, 3-row cap, newest-at-seam) and slack absorption at 0/1/6/20/100.
function QueueDemo(props: { height: number }) {
  const [count, setCount] = createSignal(DEFAULT_COUNT);
  const seed = () => POOL.slice(0, count());

  const [resolved, setResolved] = createSignal<QueueItem[]>([]);
  const [unresolved, setUnresolved] = createSignal<QueueItem[]>(seed());
  const [focused, setFocused] = createSignal<string | null>(
    seed()[0]?.id ?? null,
  );
  const [auto, setAuto] = createSignal(false);
  const [speed, setSpeed] = createSignal(DEFAULT_SPEED);

  const resolveKey = (key: string) => {
    const item = unresolved().find((i) => i.id === key);
    if (!item) return;
    setUnresolved((u) => u.filter((i) => i.id !== key));
    setResolved((r) => [...r, item]);
  };

  const resolveNext = () => {
    const list = unresolved();
    const f = focused();
    const next = (f && list.some((i) => i.id === f) ? f : list[0]?.id) ?? null;
    if (next) resolveKey(next);
  };

  const loadCount = (n: number) => {
    if (timer) clearTimeout(timer);
    setAuto(false);
    setCount(n);
    setResolved([]);
    setUnresolved(seed());
    setFocused(seed()[0]?.id ?? null);
  };
  const reset = () => loadCount(count());

  let timer: number | undefined;
  const tick = () => {
    if (!auto()) return;
    if (unresolved().length === 0) return setAuto(false);
    resolveNext();
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
    <NarrowStack>
      <WrappedClusterRow>
        <ClusterRow>
          <span class="text-meta">Items</span>
          <SegmentedControl
            options={LENGTH_OPTIONS}
            value={String(count())}
            onValueChange={(v) => loadCount(Number(v))}
          />
        </ClusterRow>
        <ClusterRow>
          <span class="text-meta">Speed</span>
          <SegmentedControl
            options={SPEED_OPTIONS}
            value={String(speed())}
            onValueChange={(v) => setSpeed(Number(v))}
          />
        </ClusterRow>
      </WrappedClusterRow>
      <WrappedClusterRow>
        <SmallPrimaryButton
          onClick={resolveNext}
          disabled={unresolved().length === 0}
        >
          Resolve next ▸
        </SmallPrimaryButton>
        <SmallGhostButton
          onClick={toggleAuto}
          disabled={unresolved().length === 0 && !auto()}
        >
          {auto() ? "Pause" : "Auto-play"}
        </SmallGhostButton>
        <SmallGhostButton onClick={reset}>Reset</SmallGhostButton>
        <span class="text-meta">
          {resolved().length} resolved · {unresolved().length} left
        </span>
      </WrappedClusterRow>
      <div style={{ width: "320px" }}>
        <SplitQueueList<QueueItem>
          resolved={resolved()}
          unresolved={unresolved()}
          keyOf={(i) => i.id}
          focusedKey={focused() ?? undefined}
          onFocusChange={setFocused}
          onSelect={setFocused}
          height={props.height}
          rowHeight={CARD_H}
          animationMs={speed()}
          resolvedLabel="Categorized"
          unresolvedLabel="To categorize"
          allClearLabel="All clear — every transaction categorized"
          renderItem={renderItem}
        />
      </div>
    </NarrowStack>
  );
}

export const SplitQueueListShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>SplitQueueList — linked processing queue</h2>
      <p class="text-meta">
        Two stacked lists sharing a fixed height. Top = categorized (solid
        accent border + ✓), bottom = to-categorize (dashed muted border + ▸
        focus). The top is content-driven between a 1-row floor and a 3-row cap;
        at 4+ it caps and scrolls so the newest sits at the seam. The bottom
        takes the remaining space and scrolls when overfull; when the bottom is
        short it shrinks and the top absorbs the slack. The consumer owns the
        data + card content and drives everything by mutating the two arrays —{" "}
        <strong>
          there is no <code>resolve()</code> method
        </strong>
        : a key moving
        <code> unresolved → resolved</code> plays the forward animation, and{" "}
        <code>resolved → unresolved</code> the mirrored reverse. Honors{" "}
        <code>prefers-reduced-motion</code>. Full usage:{" "}
        <code>src/components/SplitQueueList/README.md</code>.
      </p>

      <h3>Selection + detail panel (resolve / unresolve)</h3>
      <p class="text-meta">
        Click any card (either panel) to select it — the orange focus follows
        your selection, and a <strong>consumer-composed</strong> detail panel
        opens (<code>selectedKey</code> + <code>onSelect</code>; clicking no
        longer auto-resolves). <strong>Resolve ▸</strong> sorts the card to the
        to-categorize head then animates it up; <strong>◂ Unresolve</strong>{" "}
        sorts it to the done tail then mirrors it back down.{" "}
        <strong>Resolve next ▸</strong> / <strong>◂ Prev</strong> step through
        the head. This is the reference wiring for a triage/accept flow.
      </p>
      <SelectionDemo />

      <h3>Layout at every length</h3>
      <p class="text-meta">
        Use the <strong>Items</strong> toggle to see the layout at every length:
        <strong> 0</strong> (empty → "all clear" strip, top fills),
        <strong> 1</strong> (single), <strong>6</strong> (fits),
        <strong> 20</strong> (bottom scrolls), <strong>100</strong> (long
        scroll). Each height shows the same toggle so the proportion behavior is
        visible at each length.
      </p>

      <div class="example-row">
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
