// ============================================
// MutationSliders readouts — the headless observation.
//
// One line per dial state, per mode, printed as a table: what goes under the
// dial, what goes beneath that, and what goes beside each arrow.
// ============================================
import { describe, expect, it } from "vitest";
import { map } from "../../fn";
import { formatCompactCurrency } from "../../internal/format/number";
import { type Entity, dialGeometry } from "../MarkedSlider/geometry";
import { DEFAULT_LABELS } from "./labels";
import { type ReadoutMode, diffLabelOf, readoutsOf } from "./readouts";

const DOMAIN: readonly [number, number] = [70_000, 130_000];

const STATES: readonly Entity[] = [
  { id: "equal", label: "equal", old: 125_000, value: 125_000, range: [70_000, 130_000] },
  { id: "raise", label: "raise", old: 125_000, value: 130_000, range: [70_000, 130_000] },
  { id: "cut", label: "cut", old: 100_000, value: 90_000, range: [70_000, 130_000] },
  { id: "tiny", label: "tiny", old: 125_000, value: 125_500, range: [70_000, 130_000] },
  { id: "new", label: "new", old: null, value: 80_000, range: [70_000, 130_000] },
  { id: "removed", label: "removed", old: 90_000, value: null, range: [70_000, 130_000] },
];

const table = (mode: ReadoutMode) =>
  map((entity: Entity) => {
    const out = readoutsOf(
      mode,
      dialGeometry(DOMAIN, entity),
      formatCompactCurrency,
      DEFAULT_LABELS,
    );
    return { state: entity.id, ...out };
  }, STATES);

describe("readoutsOf — beside (Peter's payroll board)", () => {
  it("prints old beside the prior arrow, new below, and the diff right of the bar on two lines", () => {
    const rows = table("beside");
    console.table(rows);
    expect(rows).toEqual([
      { state: "equal", value: "$125K", meta: "", priorLabel: null, deltaLabel: null },
      { state: "raise", value: "$130K", meta: "", priorLabel: "$125K", deltaLabel: "+$5K\n(4%)" },
      { state: "cut", value: "$90K", meta: "", priorLabel: "$100K", deltaLabel: "\u2212$10K\n(10%)" },
      { state: "tiny", value: "$125.5K", meta: "", priorLabel: "$125K", deltaLabel: "+$500\n(<1%)" },
      { state: "new", value: "$80K", meta: "New", priorLabel: null, deltaLabel: null },
      { state: "removed", value: "—", meta: "", priorLabel: "$90K", deltaLabel: null },
    ]);
  });
});

describe("readoutsOf — stacked (the original, unchanged)", () => {
  it("prints was-prior beneath and the delta beside the line", () => {
    const rows = table("stacked");
    console.table(rows);
    expect(rows).toEqual([
      { state: "equal", value: "$125K", meta: "", priorLabel: null, deltaLabel: null },
      { state: "raise", value: "$130K", meta: "was $125K", priorLabel: null, deltaLabel: "+$5K" },
      { state: "cut", value: "$90K", meta: "was $100K", priorLabel: null, deltaLabel: "−$10K" },
      { state: "tiny", value: "$125.5K", meta: "was $125K", priorLabel: null, deltaLabel: "+$500" },
      { state: "new", value: "$80K", meta: "New", priorLabel: null, deltaLabel: null },
      { state: "removed", value: "—", meta: "was $90K", priorLabel: null, deltaLabel: null },
    ]);
  });
});

describe("diffLabelOf", () => {
  it("says nothing without both ends or without a move, and no share of zero", () => {
    expect(diffLabelOf(String, null, 5)).toBeNull();
    expect(diffLabelOf(String, 5, null)).toBeNull();
    expect(diffLabelOf(String, 5, 5)).toBeNull();
    expect(diffLabelOf(String, 0, 5)).toBe("+5");
  });
});
