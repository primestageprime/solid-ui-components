// ============================================
// Matchmaking bench — FIXTURES
//
// The vocabulary the dataset is built OUT OF: names, regions, activities,
// bands, and the weight tables that encode the planted signals. Pure data —
// no logic, no randomness, no assembly. `generate.ts` is the machinery that
// consumes this; keeping the two apart is deliberate, so the shape of the
// world can be edited without reading a line of the generator.
// ============================================
import { map } from "../../../../src/fn";

export const GENDERS = ["f", "m", "nb", "agender", "genderfluid"] as const;

/**
 * Genders are not equiprobable in any real population, and drawing them
 * uniformly makes `agender+m` the single most common pairing — which reads as
 * a bug, and buries the f+f signal under noise.
 */
export const GENDER_WEIGHTS: Record<string, number> = {
  f: 42,
  m: 40,
  nb: 10,
  genderfluid: 5,
  agender: 3,
};

export const ORIENTATIONS = [
  "straight",
  "gay",
  "lesbian",
  "bi",
  "pan",
  "ace",
  "queer",
] as const;

export const AGE_BANDS = [
  "18-24",
  "25-29",
  "30-34",
  "35-39",
  "40-44",
  "45-54",
  "55-64",
  "65+",
] as const;

export const TIERS = ["free", "plus", "concierge"] as const;

export const OUTCOMES = [
  "second-date",
  "friends",
  "no-follow-up",
  "ghosted",
] as const;

export const INTIMACY_LABELS: Record<number, string> = {
  1: "1 · stranger",
  2: "2 · known",
  3: "3 · familiar",
  4: "4 · regular",
  5: "5 · friend",
  6: "6 · inner circle",
  7: "7 · intimate",
};

export const LANGUAGES = [
  "English", "Spanish", "Mandarin", "Hindi", "Arabic", "Portuguese",
  "Bengali", "Russian", "Japanese", "Punjabi", "German", "Korean",
  "French", "Telugu", "Turkish", "Tamil", "Vietnamese", "Urdu",
  "Italian", "Thai", "Gujarati", "Polish", "Ukrainian", "Persian",
  "Malay", "Dutch", "Swedish", "Tagalog",
] as const;

export const REGIONS = [
  "Pacific Northwest",
  "Bay Area",
  "SoCal",
  "Southwest",
  "Mountain West",
  "Midwest",
  "Great Lakes",
  "Texas",
  "Deep South",
  "Mid-Atlantic",
  "New England",
  "Florida",
] as const;

// ─── Activities ──────────────────────────────────────────────────────────
// 151 members: the long-tail dimension that makes the combobox earn its keep.
// `kind` drives regional affinity; `season` drives the summer/winter signal.

export type ActivityKind =
  | "outdoor"
  | "active"
  | "food"
  | "nightlife"
  | "culture"
  | "game"
  | "quiet"
  | "event";

export type Season = "all" | "summer" | "winter";

export interface ActivityDef {
  name: string;
  kind: ActivityKind;
  season: Season;
}

const outdoor: [string, Season][] = [
  ["hiking", "summer"], ["climbing", "all"], ["bouldering", "all"],
  ["kayaking", "summer"], ["paddleboarding", "summer"], ["trail running", "summer"],
  ["birdwatching", "all"], ["tide pooling", "summer"], ["camping", "summer"],
  ["stargazing", "all"], ["mushroom foraging", "winter"], ["snowshoeing", "winter"],
  ["skiing", "winter"], ["snowboarding", "winter"], ["ice skating", "winter"],
  ["sledding", "winter"], ["beach day", "summer"], ["surfing", "summer"],
  ["tubing", "summer"], ["canoeing", "summer"], ["fishing", "all"],
  ["horseback riding", "all"], ["hot springs", "winter"], ["desert drive", "winter"],
  ["botanical garden", "summer"], ["orchard picking", "summer"], ["corn maze", "winter"],
  ["dog park", "all"], ["picnic", "summer"], ["sunset walk", "all"],
];

const active: [string, Season][] = [
  ["bouldering gym", "all"], ["yoga class", "all"], ["run club", "all"],
  ["cycling", "summer"], ["mountain biking", "summer"], ["tennis", "summer"],
  ["pickleball", "all"], ["bowling", "all"], ["midnight bowling", "all"],
  ["mini golf", "summer"], ["golf", "summer"], ["batting cages", "summer"],
  ["axe throwing", "all"], ["rollerskating", "all"], ["swimming", "summer"],
  ["dance class", "all"], ["salsa night", "all"], ["martial arts class", "all"],
  ["indoor skydiving", "all"], ["go-karting", "all"],
];

const food: [string, Season][] = [
  ["coffee", "all"], ["brunch", "all"], ["dinner", "all"], ["tacos", "all"],
  ["ramen", "winter"], ["dim sum", "all"], ["barbecue", "summer"],
  ["food truck crawl", "summer"], ["farmers market", "summer"], ["ice cream", "summer"],
  ["bakery hop", "all"], ["pizza", "all"], ["sushi", "all"], ["hot pot", "winter"],
  ["pho", "winter"], ["tasting menu", "all"], ["cooking class", "all"],
  ["baking together", "winter"], ["picnic basket", "summer"], ["oyster bar", "all"],
  ["diner breakfast", "all"], ["street food night", "summer"],
];

const nightlife: [string, Season][] = [
  ["drinks", "all"], ["cocktail bar", "all"], ["dive bar", "all"],
  ["wine tasting", "all"], ["brewery tour", "all"], ["distillery tour", "all"],
  ["karaoke", "all"], ["dancing", "all"], ["jazz club", "all"],
  ["comedy show", "all"], ["late night diner", "all"], ["rooftop bar", "summer"],
  ["speakeasy", "all"], ["club night", "all"], ["pub quiz", "all"],
];

const culture: [string, Season][] = [
  ["art museum", "all"], ["gallery opening", "all"], ["history museum", "all"],
  ["science museum", "all"], ["aquarium", "all"], ["zoo", "summer"],
  ["botanical conservatory", "winter"], ["indie film", "all"], ["film festival", "winter"],
  ["theatre", "winter"], ["opera", "winter"], ["symphony", "winter"],
  ["ballet", "winter"], ["poetry reading", "all"], ["book reading", "all"],
  ["bookstore browsing", "all"], ["record shopping", "all"], ["vintage shopping", "all"],
  ["architecture walk", "summer"], ["street art tour", "summer"],
];

const game: [string, Season][] = [
  ["trivia", "all"], ["board game cafe", "winter"], ["escape room", "all"],
  ["arcade", "all"], ["pinball bar", "all"], ["video games", "winter"],
  ["chess in the park", "summer"], ["poker night", "winter"], ["darts", "all"],
  ["pool hall", "all"], ["shuffleboard", "all"], ["puzzle night", "winter"],
  ["tabletop rpg", "winter"], ["laser tag", "all"], ["bingo", "all"],
];

const quiet: [string, Season][] = [
  ["long walk", "all"], ["library date", "winter"], ["cooking at home", "winter"],
  ["movie at home", "winter"], ["gardening", "summer"], ["pottery class", "all"],
  ["painting class", "all"], ["thrifting", "all"], ["antiquing", "all"],
  ["drive with no destination", "all"], ["porch sitting", "summer"],
  ["journaling cafe", "all"], ["plant shopping", "summer"], ["car repair together", "all"],
];

const event: [string, Season][] = [
  ["concert", "summer"], ["music festival", "summer"], ["street fair", "summer"],
  ["county fair", "summer"], ["renaissance faire", "summer"], ["baseball game", "summer"],
  ["basketball game", "winter"], ["hockey game", "winter"], ["football game", "winter"],
  ["soccer match", "all"], ["roller derby", "all"], ["drag show", "all"],
  ["open mic", "all"], ["craft fair", "winter"], ["holiday market", "winter"],
];

const withKind = (kind: ActivityKind, rows: [string, Season][]): ActivityDef[] =>
  map(([name, season]) => ({ name, kind, season }), rows);

export const ACTIVITIES: ActivityDef[] = [
  ...withKind("outdoor", outdoor),
  ...withKind("active", active),
  ...withKind("food", food),
  ...withKind("nightlife", nightlife),
  ...withKind("culture", culture),
  ...withKind("game", game),
  ...withKind("quiet", quiet),
  ...withKind("event", event),
];

// ─── Planted signals ─────────────────────────────────────────────────────
// Each constant below exists to make one finding discoverable by combining
// filters. Randomly-generated data is flat: every facet stays proportional
// under every filter, so filtering demonstrates nothing. See
// docs/superpowers/specs/2026-07-28-progressive-filter-bar-design.md.

/**
 * Base popularity. Without this, 151 activities split ~4,000 outings evenly at
 * ~26 each — "drinks" ends up as rare as "indoor skydiving", which is both
 * unrealistic and leaves the interaction signals below with sample sizes too
 * small to see.
 */
export const KIND_POPULARITY: Record<ActivityKind, number> = {
  food: 3.2,
  nightlife: 2.6,
  quiet: 1.4,
  game: 1.2,
  active: 1.0,
  culture: 1.0,
  outdoor: 0.9,
  event: 0.6,
};

/**
 * The handful of things people actually do most often. Kept deliberately
 * MODEST: staples this heavy will out-weigh the regional affinities below and
 * make every region's top activity "coffee", which erases signal 2 entirely.
 * The staples set the floor; the region signature has to be able to beat it.
 */
export const STAPLE_ACTIVITIES: Record<string, number> = {
  coffee: 3,
  drinks: 5, // also the ghosting hotspot — needs the volume to be legible
  dinner: 2.5,
  brunch: 2,
  "long walk": 1.8,
  "movie at home": 1.8,
  "cocktail bar": 1.5,
  tacos: 1.5,
  pizza: 1.5,
  hiking: 3,
  trivia: 3,
  "ice cream": 1.3,
  bowling: 1.5,
};

/**
 * SIGNAL 2 — regions have activity signatures. Multiplier applied to an
 * activity's weight in that region; anything unlisted sits at 1.
 */
export const REGION_KIND_AFFINITY: Record<string, Partial<Record<ActivityKind, number>>> = {
  "Pacific Northwest": { outdoor: 9, quiet: 2.2, nightlife: 0.4 },
  "Bay Area": { culture: 4.5, food: 3.5, outdoor: 2.0, event: 0.6 },
  SoCal: { outdoor: 5.0, nightlife: 4.5, active: 2.2, quiet: 0.5 },
  Southwest: { outdoor: 6.0, quiet: 2.0, culture: 0.6 },
  "Mountain West": { outdoor: 8.0, active: 2.6, culture: 0.4 },
  Midwest: { game: 7.0, food: 2.0, culture: 0.5, outdoor: 0.7 },
  "Great Lakes": { game: 4.5, event: 2.6, nightlife: 1.6 },
  Texas: { food: 5.0, event: 4.0, nightlife: 2.0, culture: 0.5 },
  "Deep South": { food: 5.0, quiet: 2.4, event: 2.0, culture: 0.5 },
  "Mid-Atlantic": { culture: 6.0, nightlife: 2.0, outdoor: 0.6 },
  "New England": { culture: 5.0, quiet: 2.6, outdoor: 1.5 },
  Florida: { outdoor: 4.5, nightlife: 4.5, event: 2.2, culture: 0.4 },
};

/**
 * SIGNAL 3 — an activity that exists in exactly one region. Weighted heavily
 * so it lands a few dozen outings rather than a statistically dead handful;
 * the point is a table that visibly collapses to one row, not a rarity.
 */
export const REGION_LOCKED = {
  activity: "midnight bowling",
  region: "Midwest",
  weight: 200,
};

/** SIGNAL 5 — ghosting concentrates here, but only with intimacy 1 + first meeting. */
export const GHOSTING_HOTSPOT = { activity: "drinks", multiplier: 6.0 };

/** SIGNAL 6 — supernodes: a couple of people with outsized outing counts. */
export const SUPERNODE_COUNT = 2;
export const SUPERNODE_SHARE = 0.055; // fraction of all outings they appear in
export const SUPERNODE_REGION = "Bay Area";
export const SUPERNODE_KIND: ActivityKind = "food";

/** SIGNAL 7 — seasonality. Months are 1-indexed. */
export const SUMMER_MONTHS = [5, 6, 7, 8, 9];
export const GROUP_SUMMER_BOOST = 3.2; // party size >= 4 in summer
export const FEBRUARY_INTIMACY_BOOST = 2.4; // intimacy >= 5 in February

/** SIGNAL 9 — the duration reversal. */
export const SHORT_DATE_MAX_MIN = 45;
export const LONG_DATE_MIN_MIN = 240;

export const DURATION_BANDS: { label: string; max: number }[] = [
  { label: "<45m", max: 45 },
  { label: "45–90m", max: 90 },
  { label: "90m–2h", max: 120 },
  { label: "2–4h", max: 240 },
  { label: "4–8h", max: 480 },
  { label: "8h+", max: Number.POSITIVE_INFINITY },
];

// ─── Name pools ──────────────────────────────────────────────────────────

export const FIRST_NAMES = [
  "Avery", "Rowan", "Sasha", "Nadia", "Theo", "Imani", "Dev", "Mira",
  "Kai", "Lena", "Otto", "Priya", "Yuki", "Sam", "Noor", "Bea",
  "Cleo", "Emre", "Fen", "Gwen", "Hana", "Ivo", "Jonah", "Kira",
  "Luca", "Maya", "Niko", "Oona", "Pax", "Quinn", "Remy", "Suri",
  "Tobin", "Uma", "Vero", "Wren", "Xan", "Yara", "Zev", "Anouk",
  "Basil", "Coco", "Dara", "Elio", "Faye", "Gus", "Halle", "Ines",
  "Jules", "Kenji", "Lior", "Moss", "Nell", "Osric", "Pilar", "Rafi",
  "Sunni", "Tavi", "Ursa", "Vance",
];

export const LAST_INITIALS = "ABCDEFGHJKLMNPRSTVW".split("");
