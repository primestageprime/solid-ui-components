// The CONSUMER CONTRACT, pinned — the same disposition as
// PairedMutationSliders/barrel.test.ts and MarkedSlider/barrel.test.ts, and
// for the same two hazards.
//
// An ambiguous `export *` (two modules reaching `src/index.ts` exporting one
// name) resolves to NOTHING, silently, and a rename inside the folder looks
// harmless from inside the folder. Nothing else in this promotion imports
// these names from the PACKAGE ROOT: the showcase reaches into
// `src/components/…` and the mounting tests import the module directly, so
// without this file a barrel that published nothing would have passed every
// gate.
//
// EVERY NAME HERE IS QUALIFIED for that reason. `Entity`, `Domain`,
// `ChangeTone` and `MeasureIndex` belong to MarkedSlider / MutationSliders /
// PairedMutationSliders and have live consumers; this folder publishes
// `GroupedMutationEntity`, `GroupedMeasure`, `GroupedMeasureIndex` and
// `GroupedMeasureAxis` instead, and the reverse-direction assertions below
// check the older names still resolve — a collision introduced here would
// silence THEM, not these.
import { describe, expect, it } from "vitest";
import * as sui from "../../index";
import type {
  Domain,
  Entity,
  GroupRun,
  GroupedMeasure,
  GroupedMeasureAxes,
  GroupedMeasureAxis,
  GroupedMeasureIndex,
  GroupedMutationEntity,
  GroupedMutationSliderLabels,
  GroupedMutationSlidersDataProps,
  GroupedMutationSlidersOverrides,
  GroupedMutationSlidersProps,
  MeasureIndex,
} from "../../index";

/** Fails to compile if any contract TYPE stops resolving from the root. */
type Contract = [
  GroupedMutationSlidersProps,
  GroupedMutationSlidersOverrides,
  GroupedMutationSlidersDataProps,
  GroupedMutationSliderLabels,
  GroupedMeasureAxis,
  GroupedMeasureAxes,
  GroupedMeasure,
  GroupedMutationEntity,
  GroupedMeasureIndex,
  GroupRun,
];

const AXES: GroupedMeasureAxes = [
  { label: "#", group: "mo", domain: [0, 500], snap: 1 },
  { label: "$", group: "mo", domain: [0, 600], snap: 1 },
  { label: "#", group: "yr", domain: [0, 500], snap: 1 },
  { label: "%", group: "yr", domain: [50, 100], snap: 1 },
];

const ONE: GroupedMutationEntity = {
  id: "starter",
  label: "Starter",
  measures: [
    { prior: 100, value: 120, range: [0, 300] },
    { prior: 15, value: 15, range: [9, 25] },
    { prior: 50, value: 60, range: [0, 200] },
    { prior: 85, value: 85, range: [50, 100] },
  ],
};

describe("GroupedMutationSliders barrel contract", () => {
  it("exports the component and the factory by name", () => {
    expect(typeof sui.GroupedMutationSliders).toBe("function");
    expect(typeof sui.createGroupedMutationSliders).toBe("function");
  });

  it("curries a working grouped row through the factory from the root", () => {
    const Curried = sui.createGroupedMutationSliders({ axes: AXES });
    expect(typeof Curried).toBe("function");
  });

  it("does NOT publish the private modules", () => {
    // groups.ts, axes.ts, labels.ts and dial.tsx are the headless interior;
    // publishing them would make each helper an API the manifest owes an entry
    // for.
    expect("measureEntities" in sui).toBe(false);
    expect("resolveAxes" in sui).toBe(false);
    expect("slotFor" in sui).toBe(false);
    expect("runsOf" in sui).toBe(false);
    expect("GroupedDial" in sui).toBe(false);
  });

  it("leaves every name its three siblings published intact", () => {
    // The collision this file exists to catch: a bare `Entity`, `Domain` or
    // `MeasureIndex` here would resolve the OLDER ones to nothing, silently.
    expect(typeof sui.MutationSliders).toBe("function");
    expect(typeof sui.NumberMutationSliders).toBe("function");
    expect(typeof sui.PairedMutationSliders).toBe("function");
    expect(typeof sui.createPairedMutationSliders).toBe("function");
    expect(typeof sui.MarkedSlider).toBe("function");
    expect(typeof sui.ContinuousMarkedSlider).toBe("function");
  });

  it("still resolves every contract TYPE through the root barrel", () => {
    // The assertion is the COMPILE of `Contract` above; a type that stops
    // resolving from `../../index` fails tsc, and this body keeps the aliases
    // used so the linter does not strip what the check depends on.
    const domain: Domain = [0, 500];
    const entity: Entity = {
      id: "starter",
      label: "Starter",
      old: 100,
      value: 120,
      range: [0, 300],
    };
    // The older index type, still resolving beside the qualified new one.
    const pairedIndex: MeasureIndex = 1;
    const run: GroupRun = { caption: "mo", indices: [0, 1] };
    const contract: Contract = [
      { entities: [ONE], axes: AXES, onChange: () => {} },
      { axes: AXES },
      { entities: [ONE], onChange: () => {} },
      { remove: "Discontinue" },
      AXES[0] as GroupedMeasureAxis,
      AXES,
      ONE.measures[0] as GroupedMeasure,
      ONE,
      3,
      run,
    ];
    expect(contract[8]).toBe(3);
    expect(pairedIndex).toBe(1);
    expect(entity.range).toEqual([0, 300]);
    expect(domain).toEqual([0, 500]);
  });
});
