// The CONSUMER CONTRACT, pinned — the same disposition as
// TreeDiffChart/barrel.test.ts and for the same two hazards.
//
// An ambiguous `export *` (two modules reaching `src/index.ts` exporting one
// name) resolves to NOTHING, silently, and a rename inside the folder looks
// harmless from inside the folder. Nothing else in this PR imports these names
// from the PACKAGE ROOT: the showcase reaches into `src/components/…` and the
// mounting tests import the module directly, so without this file a barrel
// that published nothing would have passed every gate.
//
// `MutationSliders` keeps `Entity`, `Domain` and `ChangeTone` as its own
// published names (it was here first and has consumers), so they are asserted
// through the root here too — this folder is where they now live.
import { describe, expect, it } from "vitest";
import * as sui from "../../index";
import type {
  ChangeTone,
  Domain,
  Entity,
  MarkedSliderDataProps,
  MarkedSliderOverrides,
  MarkedSliderProps,
} from "../../index";

/** Fails to compile if any contract TYPE stops resolving from the root. */
type Contract = [
  MarkedSliderProps,
  MarkedSliderOverrides,
  MarkedSliderDataProps,
  Entity,
  Domain,
  ChangeTone,
];

describe("MarkedSlider barrel contract", () => {
  it("exports the component, the factory and the curried variant by name", () => {
    expect(typeof sui.MarkedSlider).toBe("function");
    expect(typeof sui.createMarkedSlider).toBe("function");
    expect(typeof sui.ContinuousMarkedSlider).toBe("function");
  });

  it("still exports everything MutationSliders published before the split", () => {
    // The Primitive took the geometry module with it; the row's own names must
    // not have moved with it.
    expect(typeof sui.MutationSliders).toBe("function");
    expect(typeof sui.createMutationSliders).toBe("function");
    expect(typeof sui.NumberMutationSliders).toBe("function");
  });

  it("curries a working slider through the factory from the root", () => {
    const Curried = sui.createMarkedSlider({ snap: 5 });
    expect(typeof Curried).toBe("function");
  });

  it("still resolves every contract TYPE through the root barrel", () => {
    // The assertion is the COMPILE of `Contract` above; a type that stops
    // resolving from `../../index` fails tsc, and this body keeps the alias
    // used so the linter does not strip what the check depends on.
    const contract: Contract = [
      { domain: [0, 200], range: [40, 60], value: 52, prior: 44, label: "Ana" },
      { snap: 5 },
      { domain: [0, 200], range: [40, 60], value: 52, prior: 44, label: "Ana" },
      { id: "a", label: "Ana", old: 44, value: 52, range: [40, 60] },
      [0, 200],
      "raise",
    ];
    expect(contract[5]).toBe("raise");
  });
});
