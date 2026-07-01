import { describe, expect, it } from "vitest";
import { formatDateTimeRange } from "./formatDateTimeRange";

describe("formatDateTimeRange", () => {
  it("datetime mode, same day, both endpoints — collapses to single date with two times", () => {
    expect(
      formatDateTimeRange("2026-02-13T08:30:00Z", "2026-02-13T14:15:00Z"),
    ).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} — \d{2}:\d{2}$/);
  });

  it("datetime mode, cross-day, both endpoints — keeps both dates with both times", () => {
    expect(
      formatDateTimeRange("2026-02-13T08:30:00Z", "2026-02-15T14:15:00Z"),
    ).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} — \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    );
  });

  it("datetime mode, no end — appends 'ongoing' suffix", () => {
    expect(formatDateTimeRange("2026-02-13T08:30:00Z")).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} — ongoing$/,
    );
    expect(formatDateTimeRange("2026-02-13T08:30:00Z", null)).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} — ongoing$/,
    );
  });

  it("date mode, both endpoints — renders dates only, no times", () => {
    expect(
      formatDateTimeRange(
        "2026-02-13T08:30:00Z",
        "2026-02-15T14:15:00Z",
        "date",
      ),
    ).toMatch(/^\d{4}-\d{2}-\d{2} — \d{4}-\d{2}-\d{2}$/);
  });

  it("date mode, no end — appends 'ongoing' suffix", () => {
    expect(
      formatDateTimeRange("2026-02-13T08:30:00Z", undefined, "date"),
    ).toMatch(/^\d{4}-\d{2}-\d{2} — ongoing$/);
  });

  it("zero-pads single-digit month / day / hour / minute", () => {
    // Use a local-time-construction ISO so different host TZs all see the
    // same wall-clock date/time, since the formatter reads via getMonth()
    // / getHours() etc. (host-local).
    const localIso = new Date(2026, 0, 5, 7, 3).toISOString();
    const out = formatDateTimeRange(localIso);
    expect(out).toMatch(/2026-01-05 07:03/);
  });
});
