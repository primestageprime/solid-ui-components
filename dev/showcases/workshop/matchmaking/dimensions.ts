// ============================================
// Matchmaking bench — the twelve dimensions
//
// Each dimension says three things: which member values an outing contributes
// to it, how a member is labelled, and what columns its facet table carries.
// Cardinality spans 2 (firstMeeting) to ~500 (people) on purpose — the filter
// bar has to behave at both ends.
//
// A dimension is DIRECT if an outing contributes exactly one value, or
// SET-VALUED if it contributes one per participant (gender, orientation…).
// The engine does not care which; `valuesOf` returns an array either way.
// ============================================
import { map, mean, pipe, sortBy, sum } from "../../../../src/fn";
import type { Dataset, Outing } from "./types";
import { INTIMACY_LABELS } from "./fixtures";

export type DimensionId = string;

export interface Column {
  id: string;
  header: string;
  align?: "start" | "end";
}

export interface Dimension {
  id: DimensionId;
  label: string;
  /** Member values this outing contributes. One for direct, N for set-valued. */
  valuesOf: (outing: Outing) => string[];
  /** Human label for a member value. */
  labelOf: (value: string, data: Dataset) => string;
  columns: Column[];
  /** Cells after the leading member-label column. */
  cells: (bucket: Outing[], data: Dataset) => (string | number)[];
}

// ─── Metrics ─────────────────────────────────────────────────────────────

const rateOf = (predicate: (o: Outing) => boolean, bucket: Outing[]): string => {
  if (bucket.length === 0) return "—";
  const hits = sum(map((o: Outing) => (predicate(o) ? 1 : 0), bucket));
  return `${Math.round((hits / bucket.length) * 100)}%`;
};

const secondDateRate = (bucket: Outing[]): string =>
  rateOf((o) => o.outcome === "second-date", bucket);

const friendsRate = (bucket: Outing[]): string =>
  rateOf((o) => o.outcome === "friends", bucket);

const ghostedRate = (bucket: Outing[]): string =>
  rateOf((o) => o.outcome === "ghosted", bucket);

const avgIntimacy = (bucket: Outing[]): string =>
  bucket.length === 0
    ? "—"
    : mean(map((o: Outing) => o.intimacy, bucket)).toFixed(1);

const avgParty = (bucket: Outing[]): string =>
  bucket.length === 0
    ? "—"
    : mean(map((o: Outing) => o.participants.length, bucket)).toFixed(1);

const medianDuration = (bucket: Outing[]): string => {
  if (bucket.length === 0) return "—";
  const sorted = pipe(
    bucket,
    map((o: Outing) => o.durationMin),
    sortBy((n: number) => n),
  );
  const minutes = sorted[Math.floor(sorted.length / 2)];
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
};

const distinctPeople = (bucket: Outing[]): number => {
  const seen = new Set<string>();
  for (const outing of bucket) {
    for (const id of outing.participants) seen.add(id);
  }
  return seen.size;
};

/** Distinct C(n,2) pairs across the bucket. */
const distinctMatches = (bucket: Outing[]): number => {
  const seen = new Set<string>();
  for (const outing of bucket) {
    const ids = outing.participants;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        seen.add(ids[i] < ids[j] ? `${ids[i]}|${ids[j]}` : `${ids[j]}|${ids[i]}`);
      }
    }
  }
  return seen.size;
};

const dominantRegion = (bucket: Outing[]): string => {
  const counts = new Map<string, number>();
  for (const outing of bucket) {
    counts.set(outing.region, (counts.get(outing.region) ?? 0) + 1);
  }
  let best = "—";
  let bestCount = 0;
  for (const [region, count] of counts) {
    if (count > bestCount) {
      best = region;
      bestCount = count;
    }
  }
  return best;
};

// ─── Column shorthands ───────────────────────────────────────────────────

const col = (id: string, header: string, align: "start" | "end" = "end"): Column => ({
  id,
  header,
  align,
});

const DATES = col("dates", "Dates");
const PEOPLE = col("people", "People");
const MATCHES = col("matches", "Matches");
const INTIMACY = col("intimacy", "Avg intimacy");
const SECOND = col("second", "2nd date");
const FRIENDS = col("friends", "Friends");
const GHOSTED = col("ghosted", "Ghosted");
const DURATION = col("duration", "Median");
const PARTY = col("party", "Avg party");

// ─── The twelve ──────────────────────────────────────────────────────────

const single = (pick: (o: Outing) => string) => (o: Outing) => [pick(o)];

const asIs = (value: string): string => value;

export const DIMENSIONS: Dimension[] = [
  {
    id: "firstMeeting",
    label: "First meeting",
    valuesOf: single((o) => (o.firstMeeting ? "yes" : "no")),
    labelOf: (v) => (v === "yes" ? "first meeting" : "met before"),
    columns: [col("member", "First meeting", "start"), DATES, SECOND, GHOSTED],
    cells: (b) => [b.length, secondDateRate(b), ghostedRate(b)],
  },
  {
    id: "outcome",
    label: "Outcome",
    valuesOf: single((o) => o.outcome),
    labelOf: asIs,
    columns: [col("member", "Outcome", "start"), DATES, PEOPLE, INTIMACY, DURATION],
    cells: (b) => [b.length, distinctPeople(b), avgIntimacy(b), medianDuration(b)],
  },
  {
    id: "partySize",
    label: "Party size",
    valuesOf: single((o) => o.partySize),
    labelOf: (v) => `${v} people`,
    columns: [col("member", "Party size", "start"), DATES, MATCHES, INTIMACY, SECOND],
    cells: (b) => [b.length, distinctMatches(b), avgIntimacy(b), secondDateRate(b)],
  },
  {
    id: "gender",
    label: "Gender",
    valuesOf: (o) => o.genders,
    labelOf: asIs,
    columns: [col("member", "Gender", "start"), DATES, PEOPLE, INTIMACY, SECOND],
    cells: (b) => [b.length, distinctPeople(b), avgIntimacy(b), secondDateRate(b)],
  },
  {
    id: "durationBand",
    label: "Duration",
    valuesOf: single((o) => o.durationBand),
    labelOf: asIs,
    columns: [col("member", "Duration", "start"), DATES, INTIMACY, SECOND, GHOSTED],
    cells: (b) => [b.length, avgIntimacy(b), secondDateRate(b), ghostedRate(b)],
  },
  {
    id: "intimacy",
    label: "Intimacy",
    valuesOf: single((o) => String(o.intimacy)),
    labelOf: (v) => INTIMACY_LABELS[Number(v)] ?? v,
    columns: [col("member", "Intimacy", "start"), DATES, SECOND, FRIENDS, GHOSTED, DURATION],
    cells: (b) => [
      b.length,
      secondDateRate(b),
      friendsRate(b),
      ghostedRate(b),
      medianDuration(b),
    ],
  },
  {
    id: "orientation",
    label: "Orientation",
    valuesOf: (o) => o.orientations,
    labelOf: asIs,
    columns: [col("member", "Orientation", "start"), DATES, PEOPLE, INTIMACY, SECOND],
    cells: (b) => [b.length, distinctPeople(b), avgIntimacy(b), secondDateRate(b)],
  },
  {
    id: "region",
    label: "Region",
    valuesOf: single((o) => o.region),
    labelOf: asIs,
    columns: [col("member", "Region", "start"), DATES, PEOPLE, INTIMACY, SECOND, DURATION],
    cells: (b) => [
      b.length,
      distinctPeople(b),
      avgIntimacy(b),
      secondDateRate(b),
      medianDuration(b),
    ],
  },
  {
    id: "month",
    label: "Month",
    valuesOf: single((o) => o.month),
    labelOf: asIs,
    columns: [col("member", "Month", "start"), DATES, PARTY, INTIMACY, SECOND],
    cells: (b) => [b.length, avgParty(b), avgIntimacy(b), secondDateRate(b)],
  },
  {
    id: "genderComposition",
    label: "Composition",
    valuesOf: single((o) => o.genderComposition),
    labelOf: asIs,
    columns: [col("member", "Composition", "start"), DATES, PARTY, SECOND, FRIENDS],
    cells: (b) => [b.length, avgParty(b), secondDateRate(b), friendsRate(b)],
  },
  {
    id: "activity",
    label: "Activity",
    valuesOf: single((o) => o.activity),
    labelOf: asIs,
    columns: [col("member", "Activity", "start"), DATES, INTIMACY, SECOND, GHOSTED, DURATION],
    cells: (b) => [
      b.length,
      avgIntimacy(b),
      secondDateRate(b),
      ghostedRate(b),
      medianDuration(b),
    ],
  },
  {
    id: "people",
    label: "People",
    valuesOf: (o) => o.participants,
    labelOf: (v, data) => data.personById.get(v)?.name ?? v,
    columns: [
      col("member", "Person", "start"),
      DATES,
      MATCHES,
      col("region", "Region", "start"),
      INTIMACY,
      SECOND,
    ],
    cells: (b) => [
      b.length,
      distinctMatches(b),
      dominantRegion(b),
      avgIntimacy(b),
      secondDateRate(b),
    ],
  },
];

export const dimensionById = new Map(
  map((d: Dimension) => [d.id, d] as const, DIMENSIONS),
);
