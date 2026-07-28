// ============================================
// Engine tests. Built on small hand-written fixtures rather than the
// generator, so a failure here points at the filtering rules and not at a
// tuned weight somewhere in `fixtures.ts`.
// ============================================
import { describe, expect, it } from "vitest";
import { map } from "../../../../src/fn";
import {
  addFilter,
  addTerm,
  applyFilters,
  clearAll,
  facetRows,
  facetTables,
  removeFilter,
  removeTerm,
  toggleTerm,
} from "./engine";
import { dimensionById } from "./dimensions";
import type { Dataset, Outing, Person } from "./types";

// ─── Fixtures ────────────────────────────────────────────────────────────

const person = (id: string, gender: string): Person => ({
  id,
  name: `Person ${id}`,
  gender,
  orientation: "queer",
  ageBand: "30-34",
  tier: "free",
  language: "English",
  homeRegion: "Midwest",
});

const outing = (over: Partial<Outing> & Pick<Outing, "id">): Outing => ({
  occurredOn: "2025-03-14",
  participants: ["a", "b"],
  intimacy: 3,
  activity: "coffee",
  region: "Midwest",
  outcome: "friends",
  durationMin: 90,
  rating: 4,
  firstMeeting: false,
  partySize: "2",
  genderComposition: "f+m",
  durationBand: "45–90m",
  month: "2025-03",
  genders: ["f", "m"],
  orientations: ["queer"],
  ageBands: ["30-34"],
  tiers: ["free"],
  languages: ["English"],
  ...over,
});

const people = [
  person("a", "f"),
  person("b", "m"),
  person("c", "nb"),
];

const outings: Outing[] = [
  outing({ id: "1", region: "Midwest", activity: "coffee", genders: ["f", "m"] }),
  outing({ id: "2", region: "Midwest", activity: "trivia", genders: ["f", "f"] }),
  outing({ id: "3", region: "Texas", activity: "coffee", genders: ["m", "nb"] }),
  outing({
    id: "4",
    region: "Texas",
    activity: "hiking",
    genders: ["f", "m", "nb"],
    participants: ["a", "b", "c"],
    partySize: "3",
  }),
];

const data: Dataset = {
  people,
  outings,
  matches: [],
  personById: new Map(map((p: Person) => [p.id, p] as const, people)),
};

const idsOf = (rows: Outing[]): string[] => map((o: Outing) => o.id, rows);

// ─── Filtering ───────────────────────────────────────────────────────────

describe("applyFilters", () => {
  it("is the identity when nothing is selected", () => {
    expect(idsOf(applyFilters(outings, {}))).toEqual(["1", "2", "3", "4"]);
  });

  it("treats an empty term array as no filter, not as 'match nothing'", () => {
    expect(idsOf(applyFilters(outings, { region: [] }))).toEqual(["1", "2", "3", "4"]);
  });

  it("ORs terms within a single filter", () => {
    expect(idsOf(applyFilters(outings, { activity: ["coffee", "trivia"] }))).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("ANDs across filters", () => {
    expect(
      idsOf(applyFilters(outings, { activity: ["coffee"], region: ["Texas"] })),
    ).toEqual(["3"]);
  });

  it("matches a set-valued dimension if ANY participant qualifies", () => {
    // Outing 4 has f, m and nb aboard — selecting nb must keep it.
    expect(idsOf(applyFilters(outings, { gender: ["nb"] }))).toEqual(["3", "4"]);
  });

  it("ignores an unknown dimension id rather than filtering everything out", () => {
    expect(idsOf(applyFilters(outings, { nonsense: ["x"] }))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });
});

// ─── The rule that is easiest to get wrong ───────────────────────────────

describe("facetRows — excludes the dimension's own filter", () => {
  it("keeps every member of a dimension visible while that dimension is filtered", () => {
    const rows = facetRows(data, { region: ["Midwest"] }, dimensionById.get("region")!);
    const values = map((r) => r.value, rows);

    // Texas must still be listed with a real count — otherwise a second
    // region could never be selected.
    expect(values).toContain("Midwest");
    expect(values).toContain("Texas");
    expect(rows.find((r) => r.value === "Texas")?.count).toBe(2);
  });

  it("still narrows a dimension by OTHER dimensions' filters", () => {
    const rows = facetRows(data, { region: ["Midwest"] }, dimensionById.get("activity")!);
    const values = map((r) => r.value, rows);

    expect(values).toContain("coffee");
    expect(values).toContain("trivia");
    expect(values).not.toContain("hiking"); // hiking is Texas-only
  });

  it("counts a facet against all other filters combined", () => {
    const rows = facetRows(
      data,
      { region: ["Texas"], activity: ["hiking"] },
      dimensionById.get("region")!,
    );
    // Region ignores its own filter but still honours activity=hiking,
    // which only outing 4 (Texas) satisfies.
    expect(rows.length).toBe(1);
    expect(rows[0].value).toBe("Texas");
  });

  it("sorts rows by count descending", () => {
    const rows = facetRows(data, {}, dimensionById.get("activity")!);
    expect(rows[0].value).toBe("coffee");
    expect(rows[0].count).toBe(2);
  });
});

describe("facetTables", () => {
  it("builds one table per dimension and reports each one's active values", () => {
    const tables = facetTables(data, { region: ["Texas"] });
    expect(tables.length).toBe(12);
    expect(tables.find((t) => t.id === "region")?.activeValues).toEqual(["Texas"]);
    expect(tables.find((t) => t.id === "activity")?.activeValues).toEqual([]);
  });

  it("gives every table at least three columns and at most ten", () => {
    for (const table of facetTables(data, {})) {
      expect(table.columns.length).toBeGreaterThanOrEqual(3);
      expect(table.columns.length).toBeLessThanOrEqual(10);
    }
  });
});

// ─── State transitions ───────────────────────────────────────────────────

describe("filter state", () => {
  it("adds an empty filter and leaves an existing one alone", () => {
    const once = addFilter({}, "region");
    expect(once).toEqual({ region: [] });
    expect(addFilter({ region: ["Texas"] }, "region")).toEqual({ region: ["Texas"] });
  });

  it("adds terms without duplicating them", () => {
    const state = addTerm(addTerm({}, "region", "Texas"), "region", "Texas");
    expect(state).toEqual({ region: ["Texas"] });
  });

  it("removes the whole filter when its last term goes", () => {
    const state = addTerm({}, "region", "Texas");
    expect(removeTerm(state, "region", "Texas")).toEqual({});
  });

  it("keeps the filter when other terms remain", () => {
    const state = addTerm(addTerm({}, "region", "Texas"), "region", "Midwest");
    expect(removeTerm(state, "region", "Texas")).toEqual({ region: ["Midwest"] });
  });

  it("leaves an explicitly-added empty filter in place", () => {
    // An empty group the user just created via (+) must survive — it is
    // waiting for a term, not stale.
    expect(removeTerm({ region: [] }, "region", "Texas")).toEqual({ region: [] });
  });

  it("toggles a term in and back out", () => {
    const on = toggleTerm({}, "activity", "coffee");
    expect(on).toEqual({ activity: ["coffee"] });
    expect(toggleTerm(on, "activity", "coffee")).toEqual({});
  });

  it("does not mutate the state it is given", () => {
    const before = { region: ["Texas"] };
    addTerm(before, "region", "Midwest");
    removeFilter(before, "region");
    expect(before).toEqual({ region: ["Texas"] });
  });

  it("clears everything", () => {
    expect(clearAll()).toEqual({});
  });
});
