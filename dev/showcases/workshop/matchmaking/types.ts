// ============================================
// Matchmaking bench — domain types (no logic, no data)
//
// The fact is one DATE — an outing that happened. Named `Outing` in code
// because `Date` is the language's; labelled "dates" everywhere in the UI.
// ============================================

export type PersonId = string;

export type Intimacy = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Outcome = "second-date" | "friends" | "no-follow-up" | "ghosted";

export interface Person {
  id: PersonId;
  name: string;
  gender: string;
  orientation: string;
  ageBand: string;
  tier: string;
  language: string;
  homeRegion: string;
}

/**
 * One outing. `participants` is 2..6 — group dates are real, and the N-way
 * case is what makes "matches" (pairs) and "dates" (events) diverge.
 *
 * The fields below `rating` are DERIVED at generation time and stored flat so
 * the engine stays a pure filter over rows rather than a join planner.
 */
export interface Outing {
  id: string;
  occurredOn: string; // ISO calendar date — the other sense of "date"
  participants: PersonId[];
  intimacy: Intimacy;
  activity: string;
  region: string;
  outcome: Outcome;
  durationMin: number;
  rating: number; // 1–5

  // derived
  firstMeeting: boolean;
  partySize: string; // "2".."5", "6+"
  genderComposition: string; // canonical sorted multiset, e.g. "f+m", "f+f+m"
  durationBand: string;
  month: string; // YYYY-MM
  genders: string[]; // union across participants
  orientations: string[];
  ageBands: string[];
  tiers: string[];
  languages: string[];
}

/** A pair of people who have shared at least one outing. */
export interface Match {
  a: PersonId;
  b: PersonId;
  outings: number;
}

export interface Dataset {
  people: Person[];
  outings: Outing[];
  matches: Match[];
  personById: Map<PersonId, Person>;
}
