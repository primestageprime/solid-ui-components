// @vitest-environment node
//
// ============================================
// Execution-coverage guard — the rules that make `componentsNeverExecuted` mean
// something
// ============================================
//
// This metric exists because a STATIC rule cannot answer "does this code run".
// The tempting extension to `componentsNeverRendered` — count a module as
// covered when a mounted parent renders it — was checked against a real
// coverage run before being written, and it was wrong in both directions on the
// first list it produced. The two cases that killed it are pinned below as
// `TIMEINPUTS` and `SECTION`, with their real numbers, so nobody re-derives the
// idea from scratch.
//
// `analyse` is pure over (entries, summary), so every case is a literal.
import { describe, it, expect } from "vitest";
import { analyse } from "./execution-coverage.mjs";

/** A coverage-summary entry with `covered` of `total` functions run. */
const fns = (covered: number, total: number) => ({
  functions: { covered, total },
});

describe("analyse — the floor is zero", () => {
  it("flags a module whose functions never ran", () => {
    const { dark } = analyse({
      entries: ["/src/components/A/A.tsx"],
      summary: { "/src/components/A/A.tsx": fns(0, 12) },
    });
    expect(dark).toEqual(["/src/components/A/A.tsx"]);
  });

  it("clears a module on a single executed function", () => {
    // Deliberately not a percentage. ConfirmationModal runs 1 of 24 and passes.
    // Any threshold above zero re-opens the "how much is enough" argument that
    // this ratchet refuses to have — depth of coverage is not mechanical.
    const { dark } = analyse({
      entries: ["/src/components/A/A.tsx"],
      summary: { "/src/components/A/A.tsx": fns(1, 24) },
    });
    expect(dark).toEqual([]);
  });

  it("does not libel a module that declares no functions", () => {
    // `covered === 0` is trivially true when there is nothing to call. Such a
    // module is not dark; it is not a component either.
    const { dark, measured } = analyse({
      entries: ["/src/components/A/tokens.tsx"],
      summary: { "/src/components/A/tokens.tsx": fns(0, 0) },
    });
    expect(dark).toEqual([]);
    expect(measured).toBe(0);
  });
});

describe("analyse — why lines would not do", () => {
  // v8 attributes module INITIALISATION to the file, so an imported-but-never-
  // rendered module reads as partly covered. GroupedTable has zero call sites
  // in this repo or any consumer and still shows 1.8% of LINES. Its function
  // coverage is 0/22, which is the truth. The summary carries both; this metric
  // reads only `functions`, and this test is what stops someone "simplifying"
  // it to the line count.
  const GROUPED_TABLE = {
    functions: { covered: 0, total: 22 },
    lines: { covered: 4, total: 220, pct: 1.8 },
  };

  it("reads functions, not lines", () => {
    const { dark } = analyse({
      entries: ["/src/components/Table/GroupedTable.tsx"],
      summary: { "/src/components/Table/GroupedTable.tsx": GROUPED_TABLE },
    });
    expect(dark).toEqual(["/src/components/Table/GroupedTable.tsx"]);
  });
});

describe("analyse — the cases that killed the static shortcut", () => {
  // Both of these are real numbers from the 2026-08-04 coverage run, and both
  // are modules `componentsNeverRendered` lists as never mounted. A static
  // "a mounted parent renders it" rule gets each one backwards.
  const TIMEINPUTS = fns(0, 7); //  inside a Popover the tests open, behind a
  //                                further condition they never satisfy → DARK,
  //                                but the static rule would have cleared it.
  const SECTION = fns(18, 23); //   nothing mounts Section or its three Curried
  //                                Variants, yet it runs → NOT dark, but the
  //                                static rule kept it on the list.

  it("calls TimeInputs dark even though a mounted parent renders it", () => {
    const { dark } = analyse({
      entries: ["/src/components/DateRangePicker/TimeInputs.tsx"],
      summary: { "/src/components/DateRangePicker/TimeInputs.tsx": TIMEINPUTS },
    });
    expect(dark).toEqual(["/src/components/DateRangePicker/TimeInputs.tsx"]);
  });

  it("clears Section even though no test mounts it", () => {
    const { dark } = analyse({
      entries: ["/src/components/Section/Section.tsx"],
      summary: { "/src/components/Section/Section.tsx": SECTION },
    });
    expect(dark).toEqual([]);
  });
});

describe("analyse — a missing report is a config fault, not a backlog", () => {
  it("separates entries the report never mentions", () => {
    // An `include` glob that matches nothing would otherwise file every
    // component in the library as work to do. Keeping these apart is what lets
    // the CLI say "that is a coverage include fault" instead.
    const { dark, unmeasured, measured } = analyse({
      entries: [
        "/src/components/A/A.tsx",
        "/src/components/B/B.tsx",
        "/src/components/C/C.tsx",
      ],
      summary: { "/src/components/A/A.tsx": fns(3, 3) },
    });
    expect(dark).toEqual([]);
    expect(unmeasured).toEqual([
      "/src/components/B/B.tsx",
      "/src/components/C/C.tsx",
    ]);
    expect(measured).toBe(1);
  });

  it("reports in a stable order regardless of entry order", () => {
    const summary = {
      "/src/components/B/B.tsx": fns(0, 2),
      "/src/components/A/A.tsx": fns(0, 2),
    };
    expect(
      analyse({
        entries: ["/src/components/B/B.tsx", "/src/components/A/A.tsx"],
        summary,
      }).dark,
    ).toEqual(["/src/components/A/A.tsx", "/src/components/B/B.tsx"]);
  });
});
