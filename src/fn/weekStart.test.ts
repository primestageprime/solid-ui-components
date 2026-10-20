// @vitest-environment node
import { describe, it, expect } from "vitest";
import { weekStart } from "./weekStart";

describe("weekStart", () => {
  it("Wednesday maps to the Monday before, at local midnight", () => {
    expect(weekStart(new Date(2026, 9, 14, 15, 30))).toEqual(new Date(2026, 9, 12));
  });

  it("Monday maps to itself and Sunday to the Monday six days back", () => {
    expect(weekStart(new Date(2026, 9, 12, 0, 0))).toEqual(new Date(2026, 9, 12));
    expect(weekStart(new Date(2026, 9, 18, 23, 59))).toEqual(new Date(2026, 9, 12));
  });

  it("crosses a month boundary", () => {
    expect(weekStart(new Date(2026, 10, 1))).toEqual(new Date(2026, 9, 26));
  });

  it("takes a Sunday start and ISO strings or timestamps", () => {
    expect(weekStart(new Date(2026, 9, 14), 0)).toEqual(new Date(2026, 9, 11));
    expect(weekStart(new Date(2026, 9, 14).getTime())).toEqual(new Date(2026, 9, 12));
  });

  it("does not mutate its input", () => {
    const d = new Date(2026, 9, 14, 9);
    weekStart(d);
    expect(d).toEqual(new Date(2026, 9, 14, 9));
  });
});
