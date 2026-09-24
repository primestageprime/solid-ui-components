// BaseTable — `fit`. Split out (2026-09-24) rather than folded into
// BaseTable.test.tsx, following the repo's split-by-concern convention for
// this component's other test files.
//
// jsdom applies no real CSS layout, so the frame's actual computed width
// can't be asserted from a rendered DOM. Two things CAN be, and together they
// cover the bug: the frame carries the `hud-table--fit` class (DOM), and that
// class's stylesheet rule packs the frame itself to `max-content` rather than
// only capping it at 100% (source — the `?raw` CSS pattern Layout.test.tsx
// already uses for this same reason).
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import tableCss from "./Table.css?raw";
import { BaseTable } from "./BaseTable";
import type { TableColumn } from "./types";

interface Row {
  week: string;
  calls: number;
}

const COLUMNS: TableColumn<Row>[] = [
  { id: "week", header: "Week", accessor: "week" },
  { id: "calls", header: "Calls", accessor: "calls" },
];

const DATA: Row[] = [{ week: "W1", calls: 3 }];

describe("BaseTable — fit", () => {
  it("puts hud-table--fit on the frame, not just the inner table", () => {
    const { container } = render(() => (
      <BaseTable data={DATA} columns={COLUMNS} fit />
    ));
    const frame = container.querySelector(".hud-table") as HTMLElement;
    expect(frame.classList.contains("hud-table--fit")).toBe(true);
  });

  it("omits hud-table--fit when the prop is unset — no change to the default", () => {
    const { container } = render(() => (
      <BaseTable data={DATA} columns={COLUMNS} />
    ));
    const frame = container.querySelector(".hud-table") as HTMLElement;
    expect(frame.classList.contains("hud-table--fit")).toBe(false);
  });

  it("packs the FRAME to max-content, not just the table inside it", () => {
    // The regression this guards: `.hud-table--fit` used to declare only
    // `max-width: 100%` / `min-width: 0`, so a plain block frame with nothing
    // else constraining it still stretched to its container's full width —
    // a bordered box visibly wider than the packed columns inside it.
    expect(tableCss).toMatch(
      /\.hud-table--fit\s*\{[^}]*width:\s*max-content;[^}]*\}/,
    );
  });

  it("still caps the frame at 100% so a wide packed table doesn't blow out its container", () => {
    expect(tableCss).toMatch(
      /\.hud-table--fit\s*\{[^}]*max-width:\s*100%;[^}]*\}/,
    );
  });

  it("keeps the inner table itself packed to max-content (unchanged)", () => {
    expect(tableCss).toMatch(
      /\.hud-table--fit \.hud-table__table\s*\{[^}]*width:\s*max-content;[^}]*\}/,
    );
  });
});
