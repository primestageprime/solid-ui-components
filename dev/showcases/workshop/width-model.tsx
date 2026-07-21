// Workshop bench — Width Model (2026-07-21).
// Peter's definitive column-width model, demonstrated with live math:
//   • every column has a max width; Σmax = the table's max width — the table
//     never grows past it;
//   • below Σmax, VARIABLE columns shrink proportionally to their (max − min)
//     range — so they all reach their min together;
//   • Σmin = the table's min width — below it the table stops shrinking and
//     scrolls inside the available space;
//   • FIXED columns are the degenerate case: min === max, never flex.
// The inline width styles here are the experiment's dynamic geometry — the
// entire point of the bench is computing them.
import { createSignal, For, type Component, type JSX } from "solid-js";
import { SectionTitle, TextBody, TextSublabel, MutedBody } from "../../../src/components/Text";
import { ContentStack, TightStack } from "../../../src/components/Layout";
import { pipe, map, filter, sum } from "../../../src/fn";

/** The standard gap: the cell chrome on EACH side of the content. A fixed
 *  column's width DERIVES from its content — width = content + GAP × 2 — so
 *  the padding is equal on both sides by construction (ruled 2026-07-21);
 *  a fixed width is never an arbitrary number with slack pooling one side. */
const GAP = 8;

interface ColSpec {
  id: string;
  header: string;
  /** min === max ⇒ fixed */
  min: number;
  max: number;
  sample: string;
  /** Fixed columns: the measured content width the fixed width derives from. */
  content?: number;
}

const fixedCol = (
  id: string,
  header: string,
  content: number,
  sample: string,
): ColSpec => {
  const width = content + GAP * 2;
  return { id, header, min: width, max: width, sample, content };
};

const COLS: ColSpec[] = [
  // "2026-06-02 01:00" = 16ch at the 12px mono basis ≈ 116px
  fixedCol("ts", "TIMESTAMP", 116, "2026-06-02 01:00"),
  // "40,320" = 6ch ≈ 44px
  fixedCol("count", "COUNT", 44, "40,320"),
  { id: "name", header: "NAME (var)", min: 80, max: 240, sample: "Ever Steadfast" },
  { id: "notes", header: "NOTES (var)", min: 120, max: 360, sample: "inlet flow out of band" },
];

const isVariable = (c: ColSpec): boolean => c.max > c.min;
const rangeOf = (c: ColSpec): number => c.max - c.min;

const minSum = pipe(COLS, map((c: ColSpec) => c.min), sum); // 450
const maxSum = pipe(COLS, map((c: ColSpec) => c.max), sum); // 850
const rangeSum = pipe(COLS, filter(isVariable), map(rangeOf), sum); // 400

type Regime = "above max" | "at max" | "between" | "at min" | "below min (scroll)";

interface Distribution {
  regime: Regime;
  tableW: number;
  scrolls: boolean;
  /** id → computed width */
  widths: Record<string, number>;
  /** id → the shrink applied (variable cols only) */
  shrink: Record<string, number>;
  deficit: number;
}

/** THE model: cap at Σmax; shrink variable columns ∝ their (max − min) range
 *  until every one hits min at exactly Σmin; below Σmin, hold and scroll. */
const distribute = (available: number): Distribution => {
  if (available >= maxSum) {
    return {
      regime: available === maxSum ? "at max" : "above max",
      tableW: maxSum,
      scrolls: false,
      widths: Object.fromEntries(map((c: ColSpec) => [c.id, c.max], COLS)),
      shrink: {},
      deficit: 0,
    };
  }
  if (available <= minSum) {
    return {
      regime: available === minSum ? "at min" : "below min (scroll)",
      tableW: minSum,
      scrolls: available < minSum,
      widths: Object.fromEntries(map((c: ColSpec) => [c.id, c.min], COLS)),
      shrink: Object.fromEntries(
        pipe(COLS, filter(isVariable), map((c: ColSpec) => [c.id, rangeOf(c)])),
      ),
      deficit: maxSum - minSum,
    };
  }
  const deficit = maxSum - available;
  const shrinkOf = (c: ColSpec): number => (deficit * rangeOf(c)) / rangeSum;
  return {
    regime: "between",
    tableW: available,
    scrolls: false,
    widths: Object.fromEntries(
      map((c: ColSpec) => [c.id, isVariable(c) ? c.max - shrinkOf(c) : c.min], COLS),
    ),
    shrink: Object.fromEntries(
      pipe(COLS, filter(isVariable), map((c: ColSpec) => [c.id, shrinkOf(c)])),
    ),
    deficit,
  };
};

const px = (n: number): string => `${Math.round(n * 10) / 10}px`;

/** The math, spelled out for one distribution. */
function MathPanel(props: { available: number; d: Distribution }): JSX.Element {
  const d = () => props.d;
  const lines = (): string[] => {
    const base = [
      `available = ${props.available}px`,
      `TIMESTAMP (fixed) = content 116 + gap 8×2 = 132px — equal padding by construction`,
      `COUNT (fixed) = content 44 + gap 8×2 = 60px`,
      `Σmin = 132 + 60 + 80 + 120 = ${minSum}px`,
      `Σmax = 132 + 60 + 240 + 360 = ${maxSum}px`,
    ];
    switch (d().regime) {
      case "above max":
        return [
          ...base,
          `available > Σmax → table = Σmax = ${maxSum}px; every column at max; ${props.available - maxSum}px stays empty outside the table`,
        ];
      case "at max":
        return [...base, `available = Σmax → table = ${maxSum}px; every column exactly at max`];
      case "between":
        return [
          ...base,
          `deficit = Σmax − available = ${maxSum} − ${props.available} = ${d().deficit}px`,
          `Σrange (variable) = (240−80) + (360−120) = ${rangeSum}px`,
          `shrink NAME  = ${d().deficit} × 160/${rangeSum} = ${px(d().shrink.name ?? 0)} → NAME = ${px(d().widths.name)}`,
          `shrink NOTES = ${d().deficit} × 240/${rangeSum} = ${px(d().shrink.notes ?? 0)} → NOTES = ${px(d().widths.notes)}`,
          `fixed columns unchanged (132, 60); table = ${px(d().tableW)}`,
        ];
      case "at min":
        return [
          ...base,
          `available = Σmin → every variable column exactly at min (80, 120); table = ${minSum}px`,
        ];
      // (fixed columns never leave their derived width in any regime)
      case "below min (scroll)":
        return [
          ...base,
          `available < Σmin → table HOLDS at Σmin = ${minSum}px and scrolls the ${minSum - props.available}px overflow`,
        ];
    }
  };
  return (
    <TightStack>
      <For each={lines()}>{(l) => <MutedBody>{l}</MutedBody>}</For>
    </TightStack>
  );
}

/** One rendered case: the available-space frame (dashed), the table at its
 *  computed widths, and the math. */
function Case(props: { title: string; available: number }): JSX.Element {
  const d = () => distribute(props.available);
  return (
    <ContentStack>
      <TextBody>{props.title}</TextBody>
      <MathPanel available={props.available} d={d()} />
      <div class="width-model__frame" style={{ width: `${props.available}px` }}>
        <div class="width-model__scroller">
          <table class="width-model__table" style={{ width: px(d().tableW) }}>
            <thead>
              <tr>
                <For each={COLS}>
                  {(c) => (
                    <th
                      classList={{ "width-model__th--fixed": !isVariable(c) }}
                      style={{ width: px(d().widths[c.id]) }}
                    >
                      <TextSublabel>{c.header}</TextSublabel>
                      <div class="width-model__w">{px(d().widths[c.id])}</div>
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={[0, 1, 2]}>
                {() => (
                  <tr>
                    <For each={COLS}>{(c) => <td>{c.sample}</td>}</For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </ContentStack>
  );
}

const CASES: { title: string; available: number }[] = [
  { title: "1. Available (1000px) > Σmax (792px) — the table stops growing at max", available: 1000 },
  { title: "2. Available (792px) = Σmax — every column at its max", available: 792 },
  { title: "3. Between (592px) — variable columns shrink ∝ their range", available: 592 },
  { title: "4. Available (392px) = Σmin — variable columns at min", available: 392 },
  { title: "5. Available (300px) < Σmin — the table holds at min and scrolls", available: 300 },
];

const WidthModelBench: Component = () => {
  const [live, setLive] = createSignal(700);
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Width Model</SectionTitle>
      <TextBody>
        Two fixed columns whose widths DERIVE from content — width = content +
        standard gap (8px) each side, so fixed-column padding is always equal —
        and two variable columns (NAME 80–240px, NOTES 120–360px). Σmin = 392px,
        Σmax = 792px. Variable columns shrink in proportion to their (max − min)
        range, so they all reach min together at exactly Σmin.
      </TextBody>
      <ContentStack>
        <For each={CASES}>{(c) => <Case title={c.title} available={c.available} />}</For>
        <TextBody>Live — drag the available space:</TextBody>
        <input
          class="width-model__slider"
          type="range"
          min="250"
          max="1100"
          value={live()}
          onInput={(e) => setLive(Number(e.currentTarget.value))}
        />
        <Case
          title={`Live (${live()}px available — ${distribute(live()).regime})`}
          available={live()}
        />
      </ContentStack>
    </div>
  );
};

export const meta = { label: "Width Model" };

export default WidthModelBench;
