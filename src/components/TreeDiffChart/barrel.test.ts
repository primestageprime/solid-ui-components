// The CONSUMER CONTRACT, pinned.
//
// thorcasting-ui writes its adapters against these exact names reaching the
// PACKAGE ROOT, not the component folder. Two hazards this test exists for:
// an ambiguous `export *` (two modules reaching `src/index.ts` exporting one
// name resolves to NOTHING, silently), and a rename that looks harmless
// inside the folder. A type-only import cannot be asserted at runtime, so the
// types are pinned by the `Contract` alias below — tsc fails the file if any
// of them stops resolving through the root barrel.
import { describe, expect, it } from "vitest";
import * as sui from "../../index";
import type {
  TreeDiffBand,
  TreeDiffChartProps,
  TreeDiffChild,
  TreeDiffEntry,
  TreeDiffMode,
  TreeDiffRoot,
} from "../../index";

/** Fails to compile if any contract TYPE stops resolving from the root. */
type Contract = [
  TreeDiffChartProps,
  TreeDiffRoot,
  TreeDiffBand,
  TreeDiffChild,
  TreeDiffEntry,
  TreeDiffMode,
];

const ROOT: TreeDiffRoot = { label: "Baseline", hash: "3f7ac10" };

describe("TreeDiffChart barrel contract", () => {
  it("exports the component, the factory and the curried variant by name", () => {
    expect(typeof sui.TreeDiffChart).toBe("function");
    expect(typeof sui.createTreeDiffChart).toBe("function");
    expect(typeof sui.ScenarioTreeDiff).toBe("function");
  });

  it("exports the change-kind helpers the legend is keyed to", () => {
    expect(sui.KINDS).toEqual(["unchanged", "changed", "added", "removed"]);
    expect(typeof sui.kindColor).toBe("function");
    expect(typeof sui.kindLabel).toBe("function");
  });

  it("still resolves every contract TYPE through the root barrel", () => {
    // The assertion is the COMPILE of `Contract` above; a type that stops
    // resolving from `../../index` fails tsc, and this body keeps the alias
    // used so the linter does not strip what the check depends on.
    const contract: Contract = [
      { baseline: ROOT, compare: ROOT, bands: [] },
      ROOT,
      { name: "bucket:payroll", children: [] },
      { name: "line:ana" },
      { id: "n1", label: "Ana", hash: "d41aa07" },
      "differences",
    ];
    expect(contract[5]).toBe("differences");
  });

  it("exports the synthetic spine ids the layout mints", () => {
    expect(sui.SAME_ID).toBe("__same");
    expect(sui.ROOT_BASELINE_ID).toBe("__root_baseline");
  });
});
