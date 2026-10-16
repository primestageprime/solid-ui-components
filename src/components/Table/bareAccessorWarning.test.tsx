// The runtime half of the bare-accessor rule (ruled 2026-10-16): a bare keyed
// accessor painting an ISO date/time warns once per column in dev mode; a
// column helper never does, because its accessor is a function.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { BaseTable } from "./BaseTable";
import { dateTimeCol } from "./columnHelpers";
import {
  looksLikeIsoDateTime,
  resetBareAccessorWarnings,
  warnBareDateAccessor,
} from "./bareAccessorWarning";

interface Row {
  hour: string;
  name: string;
}
const rows: Row[] = [
  { hour: "2026-01-15 08:00", name: "a" },
  { hour: "2026-01-15 09:00", name: "b" },
];

describe("looksLikeIsoDateTime", () => {
  it("matches the date and date-time shapes a bare accessor would paint raw", () => {
    for (const v of [
      "2026-01-15",
      "2026-01-15 08:00",
      "2026-01-15T08:00:00",
      "2026-01-15T08:00:00.250Z",
      "2026-01-15T08:00:00+02:00",
    ])
      expect(looksLikeIsoDateTime(v), v).toBe(true);
  });
  it("ignores ordinary strings, numbers and partial dates", () => {
    for (const v of ["MV Aurora", "9876543", "2026", "08:00", 20260115, null])
      expect(looksLikeIsoDateTime(v), String(v)).toBe(false);
  });
});

describe("warnBareDateAccessor", () => {
  beforeEach(() => {
    resetBareAccessorWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("warns once per column and names the helper to use", () => {
    expect(warnBareDateAccessor("hour", "2026-01-15 08:00")).toBe(true);
    expect(warnBareDateAccessor("hour", "2026-01-15 09:00")).toBe(false);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(console.warn).mock.calls[0][0])).toContain(
      'dateTimeCol("hour"',
    );
  });
  it("stays silent for a non-date value", () => {
    expect(warnBareDateAccessor("name", "a")).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("BaseTable dev warning", () => {
  beforeEach(() => {
    resetBareAccessorWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("warns once for a bare keyed accessor that paints a date, across rows and re-renders", () => {
    render(() => (
      <BaseTable
        data={rows}
        columns={[
          { id: "hour", header: "Hour", accessor: "hour" },
          { id: "name", header: "Name", accessor: "name" },
        ]}
      />
    ));
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(console.warn).mock.calls[0][0])).toContain(
      '"hour"',
    );
  });

  it("never warns for a column helper (its accessor is a renderer)", () => {
    render(() => (
      <BaseTable
        data={rows}
        columns={[
          dateTimeCol<Row>("hour", "Hour", { data: rows, precision: "minute" }),
        ]}
      />
    ));
    expect(console.warn).not.toHaveBeenCalled();
  });
});
