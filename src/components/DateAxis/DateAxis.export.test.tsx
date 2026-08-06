import { describe, it, expect } from "vitest";
import * as sui from "../../index";

// Every other test in this directory imports from "./DailyDateAxis", which is
// exactly why the suite stayed green while DailyDateAxis, dayCellContent and
// dayCellContext were unreachable from the package root for as long as they
// existed. src/index.ts re-exports this family by an EXPLICIT list rather than
// `export *` (the family's `Cell` type collides with the `Cell` table
// component at the root surface), and the list never grew when they were added
// to src/components/DateAxis/index.ts. So they shipped in the tarball,
// COMPONENTS.md documented DailyDateAxis with a copyable example, and no
// consumer could import it.
//
// Anything added to the DateAxis family barrel needs a line here too.
describe("package root exports", () => {
  it("exposes the DateAxis components", () => {
    expect(sui.DateAxis).toBeTypeOf("function");
    expect(sui.DailyDateAxis).toBeTypeOf("function");
    expect(sui.createDateAxis).toBeTypeOf("function");
  });

  it("exposes the day-cell helpers a custom renderer needs", () => {
    expect(sui.dayCellContent).toBeTypeOf("function");
    expect(sui.dayCellContext).toBeTypeOf("function");
  });

  it("exposes the cell builders", () => {
    expect(sui.dailyCells).toBeTypeOf("function");
    expect(sui.weeklyCells).toBeTypeOf("function");
    expect(sui.monthlyCells).toBeTypeOf("function");
    expect(sui.hourlyCells).toBeTypeOf("function");
    expect(sui.isSameCalendarDay).toBeTypeOf("function");
  });
});
