import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { dateCol, dateTimeCol, dateTimeColWith, showSecondsFor } from "./columnHelpers";

afterEach(cleanup);

type Row = { at: string | null };
const ISO = "2026-10-15T14:05:30Z";

/** The text the column's cell shows for a row. */
const shown = (col: ReturnType<typeof dateTimeCol<Row>>, at: string | null): string => {
  const accessor = col.accessor;
  if (typeof accessor !== "function") throw new Error("dateTimeCol always gives a function accessor");
  const { container } = render(() => <>{accessor({ at })}</>);
  const text = container.textContent ?? "";
  cleanup();
  return text;
};

describe("showSecondsFor", () => {
  it("drops seconds only for minute precision", () => {
    expect([undefined, "second", "minute"].map((p) => showSecondsFor(p as "minute" | undefined))).toEqual([
      true,
      true,
      false,
    ]);
  });
});

describe("dateTimeCol timeZone and precision", () => {
  it("prints the same instant per zone and precision", () => {
    const rows: [string, string][] = [
      ["UTC, seconds (default)", shown(dateTimeCol<Row>("at", "At", { timeZone: "UTC" }), ISO)],
      ["UTC, minute", shown(dateTimeCol<Row>("at", "At", { timeZone: "UTC", precision: "minute" }), ISO)],
      ["New York, seconds", shown(dateTimeCol<Row>("at", "At", { timeZone: "America/New_York" }), ISO)],
      ["New York, minute", shown(dateTimeCol<Row>("at", "At", { timeZone: "America/New_York", precision: "minute" }), ISO)],
    ];
    expect(rows).toEqual([
      ["UTC, seconds (default)", "2026-10-15 14:05:30"],
      ["UTC, minute", "2026-10-15 14:05"],
      ["New York, seconds", "2026-10-15 10:05:30"],
      ["New York, minute", "2026-10-15 10:05"],
    ]);
  });

  it("with no options keeps the old output: host zone, with seconds", () => {
    const local = new Date(2026, 9, 15, 14, 5, 30).toISOString();
    expect(shown(dateTimeCol<Row>("at", "At"), local)).toBe("2026-10-15 14:05:30");
  });

  it("shows an em dash for an empty value in any zone", () => {
    expect(shown(dateTimeCol<Row>("at", "At", { timeZone: "UTC" }), null)).toBe("—");
  });

  it("keeps the 160px default width", () => {
    expect(dateTimeCol<Row>("at", "At", { timeZone: "UTC" }).width).toBe("160px");
  });
});

describe("dateTimeColWith", () => {
  it("bakes a zone and precision, and a call-site option wins", () => {
    const minuteUtc = dateTimeColWith({ timeZone: "UTC", precision: "minute" });
    expect(shown(minuteUtc<Row>("at", "At"), ISO)).toBe("2026-10-15 14:05");
    expect(shown(minuteUtc<Row>("at", "At", { precision: "second" }), ISO)).toBe("2026-10-15 14:05:30");
    expect(shown(minuteUtc<Row>("at", "At", { timeZone: "America/New_York" }), ISO)).toBe("2026-10-15 10:05");
  });
});

describe("optional stamps", () => {
  type Opt = { at?: string };
  it("dateTimeCol and dateCol readers may return undefined and show the empty cell", () => {
    const text = (col: ReturnType<typeof dateCol<Opt>>): string => {
      const accessor = col.accessor;
      if (typeof accessor !== "function") throw new Error("function accessor");
      const { container } = render(() => <>{accessor({})}</>);
      const out = container.textContent ?? "";
      cleanup();
      return out;
    };
    expect(text(dateTimeCol<Opt>("at", "At", { field: (r) => r.at }))).toBe("—");
    expect(text(dateCol<Opt>("at", "At", { field: (r) => r.at }))).toBe("—");
  });
});
