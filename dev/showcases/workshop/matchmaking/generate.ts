// ============================================
// Matchmaking bench — GENERATOR (the machinery)
//
// Assembles a Dataset out of `fixtures.ts` (the vocabulary) using `random.ts`
// (the only nondeterminism, injected as an Rng). Deliberately separate from
// both: the shape of the world lives in fixtures, the shape of the *process*
// lives here.
//
// Outings are emitted in chronological order because several planted signals
// depend on a pair's history at the time of the outing — intimacy above all.
// ============================================
import { filter, map, pipe, sortBy } from "../../../../src/fn";
import { type Rng, createRng } from "./random";
import type {
  Dataset,
  Intimacy,
  Match,
  Outcome,
  Outing,
  Person,
  PersonId,
} from "./types";
import {
  ACTIVITIES,
  AGE_BANDS,
  type ActivityDef,
  DURATION_BANDS,
  FEBRUARY_INTIMACY_BOOST,
  FIRST_NAMES,
  GENDERS,
  GENDER_WEIGHTS,
  GHOSTING_HOTSPOT,
  GROUP_SUMMER_BOOST,
  KIND_POPULARITY,
  LANGUAGES,
  LAST_INITIALS,
  LONG_DATE_MIN_MIN,
  ORIENTATIONS,
  REGION_KIND_AFFINITY,
  REGION_LOCKED,
  REGIONS,
  SHORT_DATE_MAX_MIN,
  STAPLE_ACTIVITIES,
  SUMMER_MONTHS,
  SUPERNODE_COUNT,
  SUPERNODE_KIND,
  SUPERNODE_REGION,
  SUPERNODE_SHARE,
  TIERS,
} from "./fixtures";

export interface GenerateOptions {
  seed?: number;
  peopleCount?: number;
  outingCount?: number;
  /** First month of the 24-month window, as YYYY-MM. */
  startMonth?: string;
}

const DEFAULTS = {
  seed: 20260728,
  peopleCount: 500,
  outingCount: 4000,
  startMonth: "2024-08",
  monthCount: 24,
};

// ─── People ──────────────────────────────────────────────────────────────

/**
 * Regions get deliberately uneven populations — a facet where every member
 * has the same count teaches nothing about filtering.
 */
const regionWeight = (index: number): number => 1 + ((index * 7) % 5) * 0.6;

const REGION_WEIGHTS = map((_region, i) => regionWeight(i), [...REGIONS]);

const buildPeople = (rng: Rng, count: number): Person[] => {
  const people: Person[] = [];
  for (let i = 0; i < count; i++) {
    const first = rng.pick(FIRST_NAMES);
    const initial = rng.pick(LAST_INITIALS);
    people.push({
      id: `p${i}`,
      name: `${first} ${initial}.`,
      // Signal 10: gender/orientation/ageBand/tier/language are drawn
      // independently of everything else, so those facets stay flat under
      // most filters. Not every dimension should reward investigation.
      gender: rng.weighted(GENDERS, (g) => GENDER_WEIGHTS[g] ?? 1),
      orientation: rng.pick(ORIENTATIONS),
      ageBand: rng.pick(AGE_BANDS),
      tier: rng.weighted(TIERS, (t) =>
        t === "free" ? 6 : t === "plus" ? 3 : 1,
      ),
      language: rng.pick(LANGUAGES),
      homeRegion: REGIONS[indexByWeight(rng, REGION_WEIGHTS)],
    });
  }
  return people;
};

const indexByWeight = (rng: Rng, weights: number[]): number => {
  let total = 0;
  for (const w of weights) total += w;
  let roll = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
};

// ─── Calendar ────────────────────────────────────────────────────────────

const monthKey = (startMonth: string, offset: number): string => {
  const [y, m] = pipe(
    startMonth.split("-"),
    map((part: string) => Number(part)),
  );
  const zero = (y * 12 + (m - 1)) + offset;
  const year = Math.floor(zero / 12);
  const month = (zero % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
};

const monthNumber = (key: string): number => Number(key.slice(5, 7));

const isSummer = (key: string): boolean =>
  SUMMER_MONTHS.includes(monthNumber(key));

const dayIn = (rng: Rng, month: string): string =>
  `${month}-${String(rng.int(1, 28)).padStart(2, "0")}`;

// ─── Party ───────────────────────────────────────────────────────────────

const pairKey = (a: PersonId, b: PersonId): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

interface PairRecord {
  key: string;
  a: PersonId;
  b: PersonId;
  count: number;
}

/**
 * Signal 7 — group outings (4+) spike in summer. Party size is otherwise a
 * hard long tail toward 2.
 */
const drawPartySize = (rng: Rng, month: string): number => {
  const groupBoost = isSummer(month) ? GROUP_SUMMER_BOOST : 1;
  const sizes = [2, 3, 4, 5, 6];
  const weights = [70, 14, 8 * groupBoost, 4 * groupBoost, 2 * groupBoost];
  return sizes[indexByWeight(rng, weights)];
};

// ─── Activity ────────────────────────────────────────────────────────────

const seasonFit = (activity: ActivityDef, month: string): number => {
  if (activity.season === "all") return 1;
  return activity.season === "summer"
    ? isSummer(month)
      ? 2.6
      : 0.15
    : isSummer(month)
      ? 0.15
      : 2.6;
};

/**
 * Signals 2 and 3 — regional activity signatures, and one activity locked to
 * a single region so that filtering it collapses the Region table to one row.
 */
const activityWeight = (
  activity: ActivityDef,
  region: string,
  month: string,
): number => {
  if (activity.name === REGION_LOCKED.activity) {
    return region === REGION_LOCKED.region ? REGION_LOCKED.weight : 0;
  }
  const affinity = REGION_KIND_AFFINITY[region]?.[activity.kind] ?? 1;
  const popularity =
    KIND_POPULARITY[activity.kind] * (STAPLE_ACTIVITIES[activity.name] ?? 1);
  return affinity * popularity * seasonFit(activity, month);
};

// ─── Intimacy ────────────────────────────────────────────────────────────

/**
 * Signal 1 — intimacy tracks the pair's shared history. Strangers cluster at
 * first meetings; inner-circle sits with pairs that have a dozen outings
 * behind them. Signal 7 — February pushes the high end up.
 */
const drawIntimacy = (rng: Rng, priorOutings: number, month: string): Intimacy => {
  const base =
    priorOutings === 0
      ? [58, 26, 10, 4, 2, 0, 0]
      : priorOutings <= 2
        ? [12, 34, 30, 15, 7, 2, 0]
        : priorOutings <= 5
          ? [3, 12, 30, 30, 17, 6, 2]
          : priorOutings <= 10
            ? [1, 4, 12, 26, 30, 19, 8]
            : [0, 1, 5, 13, 24, 32, 25];

  const februaryBoost = monthNumber(month) === 2 ? FEBRUARY_INTIMACY_BOOST : 1;
  const weights = map(
    (w: number, i: number) => (i >= 4 ? w * februaryBoost : w),
    base,
  );
  return (indexByWeight(rng, weights) + 1) as Intimacy;
};

// ─── Duration ────────────────────────────────────────────────────────────

const drawDuration = (rng: Rng, activity: ActivityDef, intimacy: number): number => {
  const kindFloor: Record<string, number> = {
    food: 55, nightlife: 90, outdoor: 150, active: 75,
    culture: 90, game: 100, quiet: 120, event: 150,
  };
  const floor = kindFloor[activity.kind] ?? 90;
  const spread = rng.int(-35, 120);
  const closeness = intimacy >= 5 ? 90 : 0;
  // The occasional outing that turns into an all-day thing — otherwise the
  // 8h+ band is defined but never populated.
  const extended = rng.chance(0.06) ? rng.int(180, 420) : 0;
  return Math.max(20, floor + spread + closeness + extended);
};

const bandForDuration = (minutes: number): string => {
  for (const band of DURATION_BANDS) {
    if (minutes < band.max) return band.label;
  }
  return DURATION_BANDS[DURATION_BANDS.length - 1].label;
};

// ─── Outcome ─────────────────────────────────────────────────────────────

interface OutcomeContext {
  intimacy: number;
  partySize: number;
  durationMin: number;
  activity: string;
  firstMeeting: boolean;
  genderComposition: string;
}

/**
 * Signals 4, 5, 8 and 9 all live here. Each is an INTERACTION — none of them
 * is visible as a main effect, which is the whole point: they only surface
 * once two or three filters are crossed.
 */
const outcomeWeights = (ctx: OutcomeContext): Record<Outcome, number> => {
  const weights: Record<Outcome, number> = {
    "second-date": 30,
    friends: 25,
    "no-follow-up": 30,
    ghosted: 15,
  };

  // Closeness dominates: intimate pairs neither ghost nor drift.
  if (ctx.intimacy >= 5) {
    weights["second-date"] *= 2.6;
    weights.ghosted *= 0.05;
    weights["no-follow-up"] *= 0.3;
  }

  // Signal 4 — the third-wheel effect. Only among high-intimacy outings, so
  // it is invisible until party size and intimacy are filtered together.
  if (ctx.partySize === 3 && ctx.intimacy >= 4) {
    weights["second-date"] *= 0.3;
    weights.friends *= 1.6;
  }

  // Signal 9 — duration cuts both ways. Short outings almost never convert;
  // a four-hour outing between strangers is the strongest signal in the set.
  if (ctx.durationMin < SHORT_DATE_MAX_MIN) weights["second-date"] *= 0.1;
  if (ctx.durationMin >= LONG_DATE_MIN_MIN && ctx.intimacy === 1) {
    weights["second-date"] *= 5.5;
  }

  // Signal 5 — ghosting is an interaction, not a main effect.
  if (
    ctx.activity === GHOSTING_HOTSPOT.activity &&
    ctx.firstMeeting &&
    ctx.intimacy === 1
  ) {
    weights.ghosted *= GHOSTING_HOTSPOT.multiplier;
  }

  // Signal 8 — f+f pairs over-index on "friends".
  if (ctx.genderComposition === "f+f") weights.friends *= 2.2;

  return weights;
};

const drawOutcome = (rng: Rng, ctx: OutcomeContext): Outcome => {
  const weights = outcomeWeights(ctx);
  return rng.weighted(
    ["second-date", "friends", "no-follow-up", "ghosted"] as Outcome[],
    (o) => weights[o],
  );
};

// ─── Derived fields ──────────────────────────────────────────────────────

const compositionOf = (genders: string[]): string =>
  pipe(
    genders,
    sortBy((g: string) => g),
    (sorted) => sorted.join("+"),
  );

const partySizeLabel = (size: number): string => (size >= 6 ? "6+" : String(size));

const uniqueOf = (values: string[]): string[] => [...new Set(values)];

// ─── Assembly ────────────────────────────────────────────────────────────

const buildOutings = (
  rng: Rng,
  people: Person[],
  outingCount: number,
  startMonth: string,
  monthCount: number,
): Outing[] => {
  const byId = new Map(map((p: Person) => [p.id, p] as const, people));
  const byRegion = new Map<string, Person[]>();
  for (const person of people) {
    const bucket = byRegion.get(person.homeRegion);
    if (bucket) bucket.push(person);
    else byRegion.set(person.homeRegion, [person]);
  }

  // Signal 6 — supernodes. Two serial daters with a distinctive profile.
  const supernodes = pipe(
    people,
    filter((p: Person) => p.homeRegion === SUPERNODE_REGION),
    (candidates) => (candidates.length >= SUPERNODE_COUNT ? candidates : people),
    (candidates) => candidates.slice(0, SUPERNODE_COUNT),
  );

  // Keyed by pair so history lookups stay O(1); `pairs` is the same records in
  // insertion order, for weighted reuse.
  const pairsByKey = new Map<string, PairRecord>();
  const pairs: PairRecord[] = [];
  const outings: Outing[] = [];

  const perMonth = Math.floor(outingCount / monthCount);

  for (let m = 0; m < monthCount; m++) {
    const month = monthKey(startMonth, m);
    const thisMonth = m === monthCount - 1 ? outingCount - outings.length : perMonth;

    for (let k = 0; k < thisMonth; k++) {
      const partySize = drawPartySize(rng, month);
      const isSupernodeOuting = rng.chance(SUPERNODE_SHARE) && supernodes.length > 0;

      const anchor = isSupernodeOuting ? rng.pick(supernodes) : undefined;
      const reusePair =
        pairs.length > 20 && !isSupernodeOuting && rng.chance(0.45)
          ? rng.weighted(pairs, (p) => p.count)
          : undefined;

      const primaryA = anchor ?? (reusePair ? byId.get(reusePair.a)! : rng.pick(people));
      const pool = byRegion.get(primaryA.homeRegion) ?? people;
      const primaryB = reusePair
        ? byId.get(reusePair.b)!
        : pickOther(rng, pool, [primaryA.id]);

      const chosen = [primaryA, primaryB];
      while (chosen.length < partySize) {
        chosen.push(pickOther(rng, pool, map((p: Person) => p.id, chosen)));
      }

      const region = primaryA.homeRegion;
      const key = pairKey(primaryA.id, primaryB.id);
      const priorOutings = pairsByKey.get(key)?.count ?? 0;
      const firstMeeting = priorOutings === 0;

      const activity = isSupernodeOuting
        ? rng.weighted(ACTIVITIES, (a) =>
            a.kind === SUPERNODE_KIND ? 8 : activityWeight(a, region, month),
          )
        : rng.weighted(ACTIVITIES, (a) => activityWeight(a, region, month));

      const intimacy = drawIntimacy(rng, priorOutings, month);
      const durationMin = drawDuration(rng, activity, intimacy);
      const genders = map((p: Person) => p.gender, chosen);
      const genderComposition = compositionOf(genders);

      const outcome = drawOutcome(rng, {
        intimacy,
        partySize: chosen.length,
        durationMin,
        activity: activity.name,
        firstMeeting,
        genderComposition,
      });

      outings.push({
        id: `o${outings.length}`,
        occurredOn: dayIn(rng, month),
        participants: map((p: Person) => p.id, chosen),
        intimacy,
        activity: activity.name,
        region,
        outcome,
        durationMin,
        rating: ratingFor(rng, intimacy, outcome),
        firstMeeting,
        partySize: partySizeLabel(chosen.length),
        genderComposition,
        durationBand: bandForDuration(durationMin),
        month,
        genders: uniqueOf(genders),
        orientations: uniqueOf(map((p: Person) => p.orientation, chosen)),
        ageBands: uniqueOf(map((p: Person) => p.ageBand, chosen)),
        tiers: uniqueOf(map((p: Person) => p.tier, chosen)),
        languages: uniqueOf(map((p: Person) => p.language, chosen)),
      });

      recordPairs(chosen, pairsByKey, pairs);
    }
  }

  return outings;
};

const pickOther = (rng: Rng, pool: Person[], exclude: PersonId[]): Person => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = rng.pick(pool);
    if (!exclude.includes(candidate.id)) return candidate;
  }
  return pool[0];
};

/** Every C(n,2) pair on the outing counts as a shared outing. */
const recordPairs = (
  chosen: Person[],
  pairsByKey: Map<string, PairRecord>,
  pairs: PairRecord[],
): void => {
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const key = pairKey(chosen[i].id, chosen[j].id);
      const existing = pairsByKey.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        const record = { key, a: chosen[i].id, b: chosen[j].id, count: 1 };
        pairsByKey.set(key, record);
        pairs.push(record);
      }
    }
  }
};

const ratingFor = (rng: Rng, intimacy: number, outcome: Outcome): number => {
  const base =
    outcome === "second-date" ? 4.3 : outcome === "friends" ? 3.6 : outcome === "no-follow-up" ? 2.6 : 1.8;
  const lift = intimacy >= 5 ? 0.5 : 0;
  return Math.min(5, Math.max(1, Math.round(base + lift + rng.next() - 0.5)));
};

const buildMatches = (outings: Outing[]): Match[] => {
  const counts = new Map<string, number>();
  for (const outing of outings) {
    const ids = outing.participants;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = pairKey(ids[i], ids[j]);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  const matches: Match[] = [];
  for (const [key, outingCount] of counts) {
    const [a, b] = key.split("|");
    matches.push({ a, b, outings: outingCount });
  }
  return matches;
};

export const generateDataset = (options: GenerateOptions = {}): Dataset => {
  const seed = options.seed ?? DEFAULTS.seed;
  const peopleCount = options.peopleCount ?? DEFAULTS.peopleCount;
  const outingCount = options.outingCount ?? DEFAULTS.outingCount;
  const startMonth = options.startMonth ?? DEFAULTS.startMonth;

  const rng = createRng(seed);
  const people = buildPeople(rng, peopleCount);
  const outings = buildOutings(
    rng,
    people,
    outingCount,
    startMonth,
    DEFAULTS.monthCount,
  );

  return {
    people,
    outings,
    matches: buildMatches(outings),
    personById: new Map(map((p: Person) => [p.id, p] as const, people)),
  };
};
