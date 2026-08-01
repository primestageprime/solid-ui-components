// ============================================
// The planted signals are acceptance criteria, not decoration.
//
// Randomly-generated demo data is FLAT: every facet stays proportional under
// every filter, so filtering it demonstrates nothing. These tests are what
// stop the dataset silently regressing to noise when a weight is tuned.
// Thresholds are deliberately loose — they assert the signal EXISTS and points
// the right way, not that it holds an exact value at this seed.
// ============================================
import { describe, expect, it } from "vitest";
import { filter, length, map, pipe } from "../../../../src/fn";
import { generateDataset } from "./generate";
import { applyFilters, facetRows } from "./engine";
import { dimensionById } from "./dimensions";
import { GHOSTING_HOTSPOT, REGION_LOCKED } from "./fixtures";
import type { Outcome, Outing } from "./types";

const data = generateDataset();

const scope = (state: Record<string, string[]>): Outing[] =>
  applyFilters(data.outings, state);

const rateOf = (outcome: Outcome, outings: Outing[]): number =>
  outings.length === 0
    ? 0
    : pipe(
        outings,
        filter((o: Outing) => o.outcome === outcome),
        length,
      ) / outings.length;

const topMembers = (state: Record<string, string[]>, dimensionId: string, n: number) =>
  pipe(
    facetRows(data, state, dimensionById.get(dimensionId)!),
    (rows) => rows.slice(0, n),
    map((row) => row.value),
  );

describe("dataset shape", () => {
  it("is deterministic at a fixed seed", () => {
    const again = generateDataset();
    expect(again.outings.length).toBe(data.outings.length);
    expect(again.outings[0]).toEqual(data.outings[0]);
    expect(again.outings[1999]).toEqual(data.outings[1999]);
  });

  it("spans 2 to ~500 rows across the twelve dimensions", () => {
    const rowsFor = (id: string) =>
      facetRows(data, {}, dimensionById.get(id)!).length;
    expect(rowsFor("firstMeeting")).toBe(2);
    expect(rowsFor("intimacy")).toBe(7);
    expect(rowsFor("region")).toBe(12);
    expect(rowsFor("month")).toBe(24);
    expect(rowsFor("activity")).toBeGreaterThan(100);
    expect(rowsFor("people")).toBeGreaterThan(400);
  });

  it("allows outings of 3 and more, not just pairs", () => {
    const sizes = new Set(map((o: Outing) => o.participants.length, data.outings));
    expect(sizes.has(2)).toBe(true);
    expect(sizes.has(3)).toBe(true);
    expect(sizes.has(4)).toBe(true);
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(5);
  });

  it("derives more matches than dates, because parties expand to C(n,2) pairs", () => {
    expect(data.matches.length).toBeGreaterThan(data.outings.length);
  });

  it("populates every duration band", () => {
    const bands = facetRows(data, {}, dimensionById.get("durationBand")!);
    expect(bands.length).toBe(6);
    for (const band of bands) expect(band.count).toBeGreaterThan(0);
  });
});

describe("planted signals", () => {
  it("1 — intimacy tracks the pair's shared history", () => {
    const strangers = scope({ intimacy: ["1"] });
    const innerCircle = scope({ intimacy: ["6", "7"] });
    const firstMeetingRate = (outings: Outing[]) =>
      pipe(
        outings,
        filter((o: Outing) => o.firstMeeting),
        length,
      ) / outings.length;

    expect(firstMeetingRate(strangers)).toBeGreaterThan(0.5);
    expect(firstMeetingRate(innerCircle)).toBeLessThan(0.05);
  });

  it("2 — regions have distinguishable activity signatures", () => {
    const pnw = topMembers({ region: ["Pacific Northwest"] }, "activity", 5);
    const midAtlantic = topMembers({ region: ["Mid-Atlantic"] }, "activity", 5);

    // The whole point: the two regions' leaderboards are not the same list.
    const overlap = pipe(
      pnw,
      filter((a: string) => midAtlantic.includes(a)),
      length,
    );
    expect(overlap).toBeLessThan(3);
    expect(pnw).toContain("hiking");
  });

  it("3 — the region-locked activity collapses the Region table to one row", () => {
    const locked = scope({ activity: [REGION_LOCKED.activity] });
    expect(locked.length).toBeGreaterThan(20);

    const regions = new Set(map((o: Outing) => o.region, locked));
    expect([...regions]).toEqual([REGION_LOCKED.region]);
  });

  it("4 — the third-wheel effect appears only when party size AND intimacy are crossed", () => {
    const pairs = rateOf("second-date", scope({ partySize: ["2"], intimacy: ["4", "5", "6", "7"] }));
    const threes = rateOf("second-date", scope({ partySize: ["3"], intimacy: ["4", "5", "6", "7"] }));
    expect(threes).toBeLessThan(pairs * 0.7);

    // …and is NOT visible as a main effect on party size alone.
    const allPairs = rateOf("second-date", scope({ partySize: ["2"] }));
    const allThrees = rateOf("second-date", scope({ partySize: ["3"] }));
    expect(Math.abs(allThrees - allPairs)).toBeLessThan(allPairs * 0.6);
  });

  it("5 — ghosting is an interaction, not a main effect", () => {
    const baseline = rateOf("ghosted", data.outings);
    const hotspot = scope({
      activity: [GHOSTING_HOTSPOT.activity],
      firstMeeting: ["yes"],
      intimacy: ["1"],
    });
    expect(hotspot.length).toBeGreaterThan(20); // enough to be legible
    expect(rateOf("ghosted", hotspot)).toBeGreaterThan(baseline * 1.8);

    // One filter deep, the activity looks unremarkable.
    const activityOnly = rateOf("ghosted", scope({ activity: [GHOSTING_HOTSPOT.activity] }));
    expect(activityOnly).toBeLessThan(baseline * 1.8);
  });

  it("6 — two supernodes dominate the People table", () => {
    const rows = facetRows(data, {}, dimensionById.get("people")!);
    expect(rows[1].count).toBeGreaterThan(rows[2].count * 2);
  });

  it("7 — group outings spike in summer; intimacy spikes in February", () => {
    const groupShare = (month: string) => {
      const outings = scope({ month: [month] });
      return (
        pipe(
          outings,
          filter((o: Outing) => o.participants.length >= 4),
          length,
        ) / outings.length
      );
    };
    expect(groupShare("2025-07")).toBeGreaterThan(groupShare("2025-01") * 1.8);

    const closeShare = (month: string) => {
      const outings = scope({ month: [month] });
      return (
        pipe(
          outings,
          filter((o: Outing) => o.intimacy >= 5),
          length,
        ) / outings.length
      );
    };
    expect(closeShare("2025-02")).toBeGreaterThan(closeShare("2025-04"));
  });

  it("8 — f+f pairs over-index on 'friends'", () => {
    expect(rateOf("friends", scope({ genderComposition: ["f+f"] }))).toBeGreaterThan(
      rateOf("friends", scope({ genderComposition: ["f+m"] })) * 1.3,
    );
  });

  it("9 — duration cuts both ways, and the long tail reverses at intimacy 1", () => {
    const baseline = rateOf("second-date", data.outings);
    expect(rateOf("second-date", scope({ durationBand: ["<45m"] }))).toBeLessThan(
      baseline * 0.4,
    );

    const longStrangers = scope({ durationBand: ["4–8h", "8h+"], intimacy: ["1"] });
    expect(longStrangers.length).toBeGreaterThan(20);
    expect(rateOf("second-date", longStrangers)).toBeGreaterThan(baseline * 1.8);
  });

  it("10 — orientation stays roughly flat, because not every facet should reward digging", () => {
    const shareOf = (state: Record<string, string[]>) => {
      const rows = facetRows(data, state, dimensionById.get("orientation")!);
      const total = rows.reduce((acc, row) => acc + row.count, 0);
      return rows[0].count / total;
    };
    expect(Math.abs(shareOf({ region: ["Pacific Northwest"] }) - shareOf({}))).toBeLessThan(
      0.08,
    );
  });
});
