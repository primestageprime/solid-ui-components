// The CONSUMER CONTRACT, pinned — the same disposition as
// MarkedSlider/barrel.test.ts and TreeDiffChart/barrel.test.ts, and for the
// same two hazards.
//
// An ambiguous `export *` (two modules reaching `src/index.ts` exporting one
// name) resolves to NOTHING, silently, and a rename inside the folder looks
// harmless from inside the folder. Nothing else in this PR imports these names
// from the PACKAGE ROOT: the showcase reaches into `src/components/…` and the
// mounting tests import the module directly, so without this file a barrel
// that published nothing would have passed every gate.
//
// EVERY NAME HERE IS QUALIFIED for that reason. `Entity`, `Domain` and
// `ChangeTone` belong to MarkedSlider/MutationSliders and have live consumers;
// this folder publishes `PairedMutationEntity`, `PairedMeasure` and
// `PairedMeasureAxis` instead, and the last assertion checks the older names
// still resolve — a collision introduced here would silence THEM, not these.
import { describe, expect, it } from "vitest";
import * as sui from "../../index";
import type {
  Domain,
  Entity,
  MeasureIndex,
  PairedMeasure,
  PairedMeasureAxes,
  PairedMeasureAxis,
  PairedMutationEntity,
  PairedMutationSliderLabels,
  PairedMutationSlidersDataProps,
  PairedMutationSlidersOverrides,
  PairedMutationSlidersProps,
} from "../../index";

/** Fails to compile if any contract TYPE stops resolving from the root. */
type Contract = [
  PairedMutationSlidersProps,
  PairedMutationSlidersOverrides,
  PairedMutationSlidersDataProps,
  PairedMutationSliderLabels,
  PairedMeasureAxis,
  PairedMeasureAxes,
  PairedMeasure,
  PairedMutationEntity,
  MeasureIndex,
];

const AXES: PairedMeasureAxes = [
  { label: "Hrs/wk", domain: [0, 80], snap: 1 },
  { label: "$/hr", domain: [0, 300], snap: 5 },
];

const ONE: PairedMutationEntity = {
  id: "design",
  label: "Design",
  measures: [
    { prior: 10, value: 20, range: [0, 40] },
    { prior: 120, value: 150, range: [100, 200] },
  ],
};

describe("PairedMutationSliders barrel contract", () => {
  it("exports the component and the factory by name", () => {
    expect(typeof sui.PairedMutationSliders).toBe("function");
    expect(typeof sui.createPairedMutationSliders).toBe("function");
  });

  it("curries a working paired row through the factory from the root", () => {
    const Curried = sui.createPairedMutationSliders({ axes: AXES });
    expect(typeof Curried).toBe("function");
  });

  it("does NOT publish the private modules", () => {
    // pairs.ts, axes.ts and labels.ts are the headless interior; publishing
    // them would make each helper API the manifest owes an entry for.
    expect("measureEntity" in sui).toBe(false);
    expect("resolveAxis" in sui).toBe(false);
    expect("PAIR_SLOT" in sui).toBe(false);
    expect("PairedDial" in sui).toBe(false);
  });

  it("leaves every name MutationSliders and MarkedSlider published intact", () => {
    // The collision this file exists to catch: a bare `Entity` or `Domain`
    // here would resolve the OLDER ones to nothing, silently.
    expect(typeof sui.MutationSliders).toBe("function");
    expect(typeof sui.NumberMutationSliders).toBe("function");
    expect(typeof sui.MarkedSlider).toBe("function");
    expect(typeof sui.ContinuousMarkedSlider).toBe("function");
  });

  it("still resolves every contract TYPE through the root barrel", () => {
    // The assertion is the COMPILE of `Contract` above; a type that stops
    // resolving from `../../index` fails tsc, and this body keeps the alias
    // used so the linter does not strip what the check depends on.
    const domain: Domain = [0, 80];
    const entity: Entity = {
      id: "design",
      label: "Design",
      old: 10,
      value: 20,
      range: [0, 40],
    };
    const contract: Contract = [
      { entities: [ONE], axes: AXES, onChange: () => {} },
      { axes: AXES },
      { entities: [ONE], onChange: () => {} },
      { remove: "Drop" },
      AXES[0],
      AXES,
      ONE.measures[0],
      ONE,
      1,
    ];
    expect(contract[8]).toBe(1);
    expect(entity.range).toEqual([0, 40]);
    expect(domain).toEqual([0, 80]);
  });
});
