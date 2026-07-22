// Workshop — Split Queue as a THREE-section progression, modeled on the JTF
// FORTNIGHT sidebar (ruled 2026-07-22): the report's vessel calls bucketed by
// compliance into one full-height progression bar:
//   • COMPLIANT     (top)    terminal-happy   — reviewed, nox & rog both pass
//   • NON-COMPLIANT (middle) terminal-unhappy — reviewed, nox or rog fails
//   • IN REVIEW     (bottom) transient        — not yet evaluated
// The `bucketOf` derivation and sizing here are the logic to promote into the
// live fortnight route.
//
// SIZING MODEL: no wasted space. An EMPTY section collapses to its summary line
// (header + total). A POPULATED section shrink-wraps. When the populated
// sections overflow the available height they share it weighted 1:1:2 (transient
// double), each capped at its content so a section that shrinks hands the
// surplus back and the others expand to fill. Neutral chrome; role color rides a
// dot beside each section name.
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

// Subset of the real VesselCallAsset contract the card needs. Compliance is
// nullable — null means "not yet evaluated" (the call is still in review).
interface Call {
  vessel_call_id: string;
  vessel_name: string;
  asset_id: string;
  connected_at: string;
  nox_compliant: boolean | null;
  rog_compliant: boolean | null;
}

// THE derivation to promote: a call with any unevaluated metric is In Review;
// otherwise Compliant iff both metrics pass, else Non-compliant.
const bucketOf = (c: Call): QState => {
  if (c.nox_compliant == null || c.rog_compliant == null) return "transient";
  return c.nox_compliant && c.rog_compliant ? "happy" : "unhappy";
};

const call = (
  n: number,
  vessel: string,
  asset: string,
  connected: string,
  nox: boolean | null,
  rog: boolean | null,
): Call => ({
  vessel_call_id: `vc-${n}`,
  vessel_name: vessel,
  asset_id: asset,
  connected_at: connected,
  nox_compliant: nox,
  rog_compliant: rog,
});

const NAMES = [
  "Ever Steadfast", "Coral Dawn", "Ever Resolute", "Northern Crane",
  "Pacific Meridian", "Harbor Vigilant", "Golden Horizon", "Iron Halcyon",
  "Silver Marlin", "Blue Sentinel", "Cape Ranger", "Tide Warden",
];

// N calls with a given compliance pair (null/null → in review).
const gen = (n: number, nox: boolean | null, rog: boolean | null, tag: string): Call[] =>
  Array.from({ length: n }, (_, k) =>
    call(
      `${tag}${k}` as unknown as number,
      NAMES[k % NAMES.length],
      `BE-${104 + (k % 12)}`,
      `2026-06-${String(10 + (k % 18)).padStart(2, "0")} ${String(6 + (k % 16)).padStart(2, "0")}:15`,
      nox,
      rog,
    ),
  );

// Realistic fortnight distributions. Compliance drives the bucket via bucketOf.
const SCENARIOS: Record<string, Call[]> = {
  none: [],
  fresh: gen(6, null, null, "r"), // just synced — nothing evaluated yet
  reviewed: [
    ...gen(4, true, true, "c"),
    ...gen(3, false, true, "n"), // nox fails
  ],
  mix: [
    ...gen(4, true, true, "c"),
    ...gen(3, true, false, "n"), // rog fails
    ...gen(5, null, null, "r"),
  ],
  overflow: [...gen(8, true, true, "c"), ...gen(8, false, false, "n"), ...gen(24, null, null, "r")],
  terminalHeavy: [
    ...gen(20, true, true, "c"),
    ...gen(20, false, true, "n"),
    ...gen(4, null, null, "r"),
  ],
};

const SCENARIO_OPTIONS = [
  { value: "none", label: "Empty report" },
  { value: "fresh", label: "Fresh (all in review)" },
  { value: "reviewed", label: "Reviewed" },
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
const allocate = (natural: number[], counts: number[], available: number): number[] => {
  const out = natural.map((h) => h);
  let pool = available - GAP * (natural.length - 1);
  let active: number[] = [];
  natural.forEach((h, i) => {
    if (counts[i] === 0) pool -= h;
    else active.push(i);
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

const Row = (c: Call): JSX.Element => (
  <div
    class="prog-bar__row"
    style={{
      padding: "6px 12px",
      "border-top": "1px solid var(--sui-border-subtle, rgba(127,127,127,0.15))",
    }}
  >
    <SpreadRow>
      <NarrowStack>
        <EllipsizedTitle>{c.vessel_name}</EllipsizedTitle>
        <FadedNowrapSublabel>{`${c.asset_id} · ${c.connected_at}`}</FadedNowrapSublabel>
      </NarrowStack>
    </SpreadRow>
  </div>
);

const SplitQueueBench: Component = () => {
  const [scenario, setScenario] = createSignal("mix");
  const calls = createMemo(() => SCENARIOS[scenario()]);
  const callsIn = (role: QState) => calls().filter((c) => bucketOf(c) === role);
  const counts = createMemo(() => SECTIONS.map((s) => callsIn(s.role).length));

  // Available height = viewport bottom − the bar's measured top, so the bar
  // fills exactly the space below the controls at any window size. Section
  // natural heights are deterministic from row counts (one measured row +
  // header, recalibrated on resize) — no per-section body measurement, which
  // goes stale when a section's body unmounts.
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
    measure();
    requestAnimationFrame(measure);
    onCleanup(() => window.removeEventListener("resize", measure));
  });
  createEffect(() => {
    calls();
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
        The fortnight report's vessel calls bucketed by compliance — Compliant
        (top), Non-compliant (middle), In review (bottom). Empty sections
        collapse to a summary line; populated sections shrink-wrap; on overflow
        they share the height 1:1:2 and hand back any surplus they don't need.
      </MutedBody>

      <ClusterRow>
        <SubsectionTitle>Scenario</SubsectionTitle>
        <SegmentedControl options={SCENARIO_OPTIONS} value={scenario()} onValueChange={setScenario} />
      </ClusterRow>

      <div style={{ "max-width": "460px", "margin-top": "12px" }}>
        <div class="prog-bar" ref={(el) => (barRef = el)} style={{ height: `${Math.round(barH())}px` }}>
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
                      <For each={callsIn(s.role)}>
                        {(c, ci) => (
                          <div ref={(el) => (i() === 0 && ci() === 0 ? (rowRef = el) : undefined)}>
                            {Row(c)}
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
