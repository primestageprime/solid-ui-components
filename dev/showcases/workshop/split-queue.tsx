// Workshop — Split Queue as a THREE-section progression (ruled 2026-07-22).
// A work item's lifecycle as three ALWAYS-present sections stacked into one
// full-height bar:
//   • TERMINAL-HAPPY   (top)    — done, good outcome
//   • TERMINAL-UNHAPPY (middle) — done, bad outcome
//   • TRANSIENT        (bottom) — still in flight
//
// SIZING MODEL (ruled 2026-07-22): no wasted space.
//   • An EMPTY section collapses to just its summary line (header + total).
//   • A POPULATED section shrink-wraps to its content.
//   • When the populated sections' content OVERFLOWS the available height they
//     share the space weighted 1:1:2 (transient double) — but a section never
//     takes more than its content needs; a section that shrink-wraps under its
//     share hands the surplus back, and the others expand to fill it.
// That's a weighted water-fill (proportional share, capped at content,
// redistribute surplus), computed here from measured content heights — flexbox
// can't express "grow to a weighted share, but only up to content".
import {
  type Component,
  type JSX,
  createSignal,
  createMemo,
  createEffect,
  onMount,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import {
  SectionTitle,
  SubsectionTitle,
  MutedBody,
  EllipsizedTitle,
  FadedNowrapSublabel,
} from "../../../src/components/Text";
import { NarrowStack, SpreadRow, ClusterRow } from "../../../src/components/Layout";

type QState = "happy" | "unhappy" | "transient";

interface QueueItem {
  id: string;
  vessel: string;
  asset: string;
  at: string;
  state: QState;
}

const item = (
  id: string,
  vessel: string,
  asset: string,
  at: string,
  state: QState,
): QueueItem => ({ id, vessel, asset, at, state });

const POOL: QueueItem[] = [
  item("vc-01", "Ever Steadfast", "BE-104", "2026-06-10 21:15", "happy"),
  item("vc-03", "Coral Dawn", "BE-112", "2026-06-12 07:00", "happy"),
  item("vc-06", "Ever Resolute", "BE-215", "2026-06-15 05:20", "happy"),
  item("vc-08", "Northern Crane", "BE-118", "2026-06-17 02:40", "happy"),
  item("vc-02", "Pacific Meridian", "BE-207", "2026-06-11 04:30", "unhappy"),
  item("vc-04", "Harbor Vigilant", "BE-104", "2026-06-13 15:10", "unhappy"),
  item("vc-05", "Golden Horizon", "BE-309", "2026-06-14 23:45", "unhappy"),
  item("vc-07", "Iron Halcyon", "BE-221", "2026-06-16 11:05", "transient"),
  item("vc-09", "Silver Marlin", "BE-303", "2026-06-18 19:55", "transient"),
  item("vc-10", "Blue Sentinel", "BE-142", "2026-06-19 08:30", "transient"),
  item("vc-11", "Cape Ranger", "BE-256", "2026-06-20 13:12", "transient"),
  item("vc-12", "Tide Warden", "BE-190", "2026-06-21 22:48", "transient"),
];

const withState = (s: QState) => (i: QueueItem): QueueItem => ({ ...i, state: s });

// N items of one state, cycling the pool for believable rows with unique ids.
const gen = (n: number, state: QState, tag: string): QueueItem[] =>
  Array.from({ length: n }, (_, k) => ({
    ...POOL[k % POOL.length],
    id: `${tag}-${k}`,
    state,
  }));

const SCENARIOS: Record<string, QueueItem[]> = {
  none: [],
  recent: POOL.filter((i) => i.state !== "transient").slice(0, 4),
  resolvedNc: POOL.filter((i) => i.state === "unhappy"),
  mix: POOL,
  // All three overflow their share → clean 1:1:2 (transient double).
  overflow: [...gen(8, "happy", "h"), ...gen(8, "unhappy", "u"), ...gen(24, "transient", "t")],
  // Transient shrinks to its 4 rows; the two heavy terminals expand 1:1 into
  // the freed space (the surplus-redistribution case).
  terminalHeavy: [...gen(20, "happy", "h"), ...gen(20, "unhappy", "u"), ...gen(4, "transient", "t")],
};

const SCENARIO_OPTIONS = [
  { value: "none", label: "No data" },
  { value: "recent", label: "Just recent" },
  { value: "resolvedNc", label: "Resolved non-compliant" },
  { value: "mix", label: "Full mix" },
  { value: "overflow", label: "Overflow (1:1:2)" },
  { value: "terminalHeavy", label: "20 / 20 / 4" },
];

interface SectionDef {
  role: QState;
  title: string;
  weight: number;
}
// Top → bottom; weights apply only when content overflows the available height.
const SECTIONS: SectionDef[] = [
  { role: "happy", title: "Compliant", weight: 1 },
  { role: "unhappy", title: "Non-compliant", weight: 1 },
  { role: "transient", title: "In review", weight: 2 },
];

const GAP = 8;

// Weighted water-fill: give each populated section its content height when it
// fits; when the populated sections overflow the pool, share it by weight —
// capping each at its content and redistributing the surplus to the ones still
// short. Empty sections are fixed at their summary-line (header) height.
const allocate = (
  natural: number[], // content height per section (header only for empty ones)
  counts: number[],
  available: number,
): number[] => {
  const out = natural.map((h) => h);
  let pool = available - GAP * (natural.length - 1);
  let active: number[] = [];
  natural.forEach((h, i) => {
    if (counts[i] === 0) pool -= h; // empty: fixed at its summary line
    else {
      pool -= 0;
      active.push(i);
    }
  });
  active.forEach((i) => (out[i] = 0));
  while (active.length && pool > 0.5) {
    const wSum = active.reduce((a, i) => a + SECTIONS[i].weight, 0);
    let capped = -1;
    for (const i of active) {
      const share = (pool * SECTIONS[i].weight) / wSum;
      const room = natural[i] - out[i];
      if (share >= room - 0.5) {
        capped = i;
        break;
      }
    }
    if (capped >= 0) {
      const room = natural[capped] - out[capped];
      out[capped] += room;
      pool -= room;
      active = active.filter((i) => i !== capped);
    } else {
      active.forEach((i) => (out[i] += (pool * SECTIONS[i].weight) / wSum));
      pool = 0;
    }
  }
  return out;
};

const ItemRow = (i: QueueItem): JSX.Element => (
  <div
    class="prog-bar__row"
    style={{
      padding: "6px 12px",
      "border-top": "1px solid var(--sui-border-subtle, rgba(127,127,127,0.15))",
    }}
  >
    <SpreadRow>
      <NarrowStack>
        <EllipsizedTitle>{i.vessel}</EllipsizedTitle>
        <FadedNowrapSublabel>{`${i.asset} · ${i.at}`}</FadedNowrapSublabel>
      </NarrowStack>
    </SpreadRow>
  </div>
);

const SplitQueueBench: Component = () => {
  const [scenario, setScenario] = createSignal("mix");
  const items = createMemo(() => SCENARIOS[scenario()]);
  const rowsIn = (role: QState) => items().filter((i) => i.state === role);
  const counts = createMemo(() => SECTIONS.map((s) => rowsIn(s.role).length));

  // Available height = viewport bottom − the bar's own top (measured, not a
  // hardcoded offset), so the bar always fills exactly the space below the
  // controls regardless of window size. The natural height of a section is
  // deterministic from its row count — one measured row + header (recalibrated
  // on resize/zoom) — avoiding per-section DOM measurement, which goes stale the
  // moment a section's body unmounts.
  const BOTTOM_MARGIN = 24;
  let barRef: HTMLDivElement | undefined;
  let rowRef: HTMLDivElement | undefined;
  let headRef: HTMLDivElement | undefined;
  const [barH, setBarH] = createSignal(0);
  const [rowH, setRowH] = createSignal(54);
  const [headH, setHeadH] = createSignal(34);

  const measure = () => {
    if (!barRef) return;
    const top = barRef.getBoundingClientRect().top;
    setBarH(Math.max(120, window.innerHeight - top - BOTTOM_MARGIN));
    if (rowRef?.offsetHeight) setRowH(rowRef.offsetHeight);
    if (headRef?.offsetHeight) setHeadH(headRef.offsetHeight);
  };

  onMount(() => {
    window.addEventListener("resize", measure);
    requestAnimationFrame(measure);
    onCleanup(() => window.removeEventListener("resize", measure));
  });
  // Recalibrate the row/header sample after the item set changes (a scenario
  // with content must have rendered a row before we can measure one).
  createEffect(() => {
    items();
    requestAnimationFrame(measure);
  });

  const natural = createMemo(() =>
    counts().map((c) => (c === 0 ? headH() + 2 : headH() + c * rowH() + 2)),
  );
  const heights = createMemo(() => allocate(natural(), counts(), barH()));

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Split Queue</SectionTitle>
      <MutedBody>
        Three always-present sections as one progression bar. Empty sections
        collapse to a summary line; populated sections shrink-wrap; when content
        overflows, the sections share the height 1:1:2 (transient double) and
        hand back any surplus they don't need.
      </MutedBody>

      <ClusterRow>
        <SubsectionTitle>Scenario</SubsectionTitle>
        <SegmentedControl options={SCENARIO_OPTIONS} value={scenario()} onValueChange={setScenario} />
      </ClusterRow>

      <div style={{ "max-width": "460px", "margin-top": "12px" }}>
        <div class="prog-bar" ref={barRef} style={{ height: `${Math.round(barH())}px` }}>
          <For each={SECTIONS}>
            {(s, i) => {
              const count = () => counts()[i()];
              return (
                <div
                  class={`prog-bar__section prog-bar__section--${s.role}`}
                  style={{ height: `${Math.round(heights()[i()] ?? 0)}px` }}
                >
                  <div class="prog-bar__header" ref={(el) => (i() === 0 ? (headRef = el) : undefined)}>
                    <span class="prog-bar__title">
                      <span class="prog-bar__dot" />
                      {s.title}
                    </span>
                    <span class="prog-bar__count">{count()}</span>
                  </div>
                  <Show when={count() > 0}>
                    <div class="prog-bar__body">
                      <For each={rowsIn(s.role)}>
                        {(r, ri) => (
                          <div ref={(el) => (i() === 0 && ri() === 0 ? (rowRef = el) : undefined)}>
                            {ItemRow(r)}
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};

export const meta = { label: "Split Queue" };

export default SplitQueueBench;
