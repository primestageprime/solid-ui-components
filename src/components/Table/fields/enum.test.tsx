import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { enumCol } from "./enum";

afterEach(cleanup);

// The enum field module: a small fixed-set string column whose geometry is
// derived from the value SET at configure time (content-fit fixed at the
// longest member), floored at the header label. Guards the ≤20ch refusal, the
// blank/muted rendering rules, tone application, and sortValue.

interface Row {
  period: string | null;
  highlight: boolean;
}

const PERIODS = ["Before", "During", "After"] as const;

const asFn = (accessor: unknown): ((row: Row) => JSX.Element) => {
  if (typeof accessor !== "function")
    throw new Error("accessor is not a function");
  return accessor as (row: Row) => JSX.Element;
};

const asSort = (col: { sortValue?: unknown }): ((row: Row) => string) => {
  if (typeof col.sortValue !== "function")
    throw new Error("sortValue is not a function");
  return col.sortValue as (row: Row) => string;
};

describe("enumCol — geometry", () => {
  it("content-fits FIXED at the longest member (min === max), plain LEFT header", () => {
    // Longest member "Before"/"During"/"After" = 6ch; header "Phase" (5ch) is
    // shorter, so the set drives the geometry.
    const col = enumCol<Row>("period", PERIODS, { header: "Phase" });
    expect(col.geo).toEqual({ minCh: 6, maxCh: 6, padPx: 16, css: "calc(6ch + 16px)" });
    expect(col.width).toBe("calc(6ch + 16px)");
    // Left-aligned flowing word: bare header string, no centered() wrap, no align.
    expect(col.header).toBe("Phase");
    expect(typeof col.header).toBe("string");
    expect(col.align).toBeUndefined();
    expect(col.id).toBe("period");
  });

  it("humanizes the key into the header when none is given", () => {
    const col = enumCol<Row>("period", PERIODS);
    expect(col.header).toBe("Period");
  });

  it("floors the fixed geometry at a longer header label (ruled 2026-07-21)", () => {
    // Members "Yes"/"No" (longest 3ch) under an 18ch header widen to the label.
    const col = enumCol<Row>("period", ["Yes", "No"], {
      header: "Operational Status", // 18ch > the 3ch member geometry
    });
    expect(col.geo.minCh).toBe(18);
    expect(col.geo.maxCh).toBe(18);
    expect(col.width).toBe("calc(18ch + 16px)");
  });
});

describe("enumCol — the ≤20ch refusal", () => {
  it("throws at configure time when any member exceeds 20 characters", () => {
    expect(() =>
      enumCol<Row>("period", ["A twenty-one char value"]),
    ).toThrow(/textCol/);
  });

  it("accepts a member exactly at the 20ch boundary", () => {
    expect(() =>
      enumCol<Row>("period", ["Exactly-twenty-chars"]), // 20ch
    ).not.toThrow();
  });
});

describe("enumCol — cell rendering", () => {
  it("applies the configured tone to a known value", () => {
    const col = enumCol<Row>("period", PERIODS, {
      tone: (_v, row) => (row.highlight ? "success" : "default"),
    });
    const { container } = render(() =>
      asFn(col.accessor)({ period: "During", highlight: true }),
    );
    expect(
      container.querySelector(".sui-field-tone--success")?.textContent,
    ).toBe("During");
  });

  it("renders a known value with a default tone as bare text", () => {
    const col = enumCol<Row>("period", PERIODS);
    const { container } = render(() =>
      asFn(col.accessor)({ period: "Before", highlight: false }),
    );
    expect(container.textContent).toBe("Before");
    expect(container.querySelector("[class^='sui-field-tone']")).toBeNull();
  });

  it("renders blank when the value is nullish (ruled 2026-07-18: no empty markers)", () => {
    const col = enumCol<Row>("period", PERIODS);
    const { container } = render(() =>
      asFn(col.accessor)({ period: null, highlight: false }),
    );
    expect(container.textContent).toBe("");
  });

  it("renders a value outside the set as quiet muted text (statusCol spirit)", () => {
    const col = enumCol<Row>("period", PERIODS);
    const { container } = render(() =>
      asFn(col.accessor)({ period: "Sideways", highlight: false }),
    );
    expect(container.querySelector(".sui-field-tone--muted")?.textContent).toBe(
      "Sideways",
    );
  });
});

describe("enumCol — sortValue", () => {
  it("sorts by the raw string, blanks to empty", () => {
    const col = enumCol<Row>("period", PERIODS);
    expect(asSort(col)({ period: "After", highlight: false })).toBe("After");
    expect(asSort(col)({ period: null, highlight: false })).toBe("");
  });
});
