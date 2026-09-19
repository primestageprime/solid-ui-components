/**
 * Board Kit — A BOARD IS A CONFIG.
 *
 * Peter, 2026-09-18, on the Scenario, Hourly and License boards being written
 * three times: "These should mostly be lens mutations on existing config
 * types, right?" He is right, and this file is the config type.
 *
 * What the three boards actually share, once the vocabulary is stripped off, is
 * ONE shape: a roster of entities, each carrying N measures that step over time
 * at change events, read against a calendar and priced into a single rate. The
 * Scenario Board's entity is a person with one measure (pay); the Hourly
 * Board's is a service with two (hours a week, dollars an hour); the License
 * Board's is a plan with four. Nothing else about them differs in the model.
 *
 * ── THE ONE LINE EVERY BOARD'S MONEY COMES OUT OF ──────────────────────────
 *
 *     rate = side === "revenue"  ?  Σ contribution − fixedCost
 *                                :  fixedCost − Σ contribution
 *
 * That `side` is the whole of the difference between a board where up is good
 * and a board where up is bad. The Hourly Board sells hours, so its
 * contribution is revenue and its fixed cost is overhead: `Σ hours × rate −
 * 1,700`. The Scenario Board pays salaries, so its contribution is payroll and
 * its "fixed cost" is the surplus the payroll is drawn against: `220,000 −
 * Σ pay`, which is `RATE_BASELINE + Σ committed pay − Σ pay` and reads 60,000
 * on the opening roster exactly as `scenario-board-rate.ts` states it. One
 * subtraction, read in two directions, rather than two models.
 *
 * ── WHAT IS DELIBERATELY NOT IN HERE ───────────────────────────────────────
 *
 * A `baseline` strategy — a committed schedule a change is an OFFSET against —
 * was specified for this kit and is NOT implemented, because neither shipped
 * board has one. The Hourly Board's seasonality used to be a formula and Peter
 * removed it (2026-09-18: "I'll compose the seasonality from those changes"),
 * so a change on every board is an ABSOLUTE level that holds until the next
 * one. Adding an offset mode with no consumer would be dead surface area on a
 * config three boards have to keep working (AGENT_GUIDE, The #2 Rule). The
 * README says what to do when a board genuinely wants one.
 *
 * Roles/bands are likewise absent: an entity carries its own `ranges`, and
 * deriving those from a role is the CONSUMER's step at fixture-build time —
 * which is what `scenario-board-people.ts` already does, and what keeps a
 * fixture from stating a range that disagrees with its own role.
 */
import type { Mutation, TimeDomain } from "../../../../src";

// ── The unit ─────────────────────────────────────────────────────────────────

/**
 * THE UNIT EVERY MONEY FIGURE ON A BOARD IS QUOTED IN.
 *
 * Not a formatting choice — it is what the rate MEANS, and so what the gauge
 * reads, what the projection integrates and what the sentences say. The
 * Scenario Board quotes salaries per year, the Hourly Board quotes $/wk
 * ("hourly people tend to think of it that way"), and the License Board quotes
 * $/mo. Each board picks one and everything downstream reads it from here.
 */
export type BoardUnit = "yr" | "mo" | "wk";

/** How many of each unit a year holds. The whole of the unit conversion. */
export const UNITS_PER_YEAR: Readonly<Record<BoardUnit, number>> = {
  yr: 1,
  mo: 12,
  wk: 52,
};

/**
 * How many `rate` units one `sample` unit holds — the factor an integral needs
 * when the rate is quoted in one unit and the span measured in another.
 *
 * `unitsPer("wk", "mo")` is 52/12: one month holds four-and-a-third weeks, so a
 * $/wk rate integrated over a month of the balance chart is multiplied by it.
 * `unitsPer("yr", "mo")` is 1/12, which is the Scenario Board's `monthlyFrom`.
 * Both boards wrote that factor by hand, in opposite directions, and one of the
 * two was only ever checked by a DEBUG table.
 */
export const unitsPer = (rate: BoardUnit, sample: BoardUnit): number =>
  UNITS_PER_YEAR[rate] / UNITS_PER_YEAR[sample];

// ── The calendar ─────────────────────────────────────────────────────────────

/**
 * THE GRAIN a change can land on — how coarse the board's calendar is.
 *
 * `"quarter"` is the Scenario Board's, `"week"` the Hourly Board's (Peter,
 * 2026-09-17: weekly clicks, "that allows for weekly seasonality in
 * projections"), `"month"` the one the License Board asks for. It is bound ONCE
 * per board rather than passed per call site, because every way a change can be
 * created has to land on the same grid: change creation dedupes on an exact
 * timestamp, so two entry points disagreeing by a grain would put two flags
 * inside one slot.
 */
export type BoardGrain = "quarter" | "month" | "week";

// ── The measures ─────────────────────────────────────────────────────────────

/**
 * ONE DIAL: what a single measure of an entity is, and how it is drawn.
 *
 * `domain` and `snap` are the SHARED TRACK — the same for every entity in the
 * column, which is what makes two of them comparable. The per-entity allowance
 * (the shaded box, and the clamp) rides on the entity's own `ranges` instead.
 *
 * `group` is what lets a four-dial board draw two paired rows rather than four
 * lonely ones: axes sharing a group name are laid out together.
 */
export interface MeasureAxis {
  readonly label: string;
  readonly domain: readonly [number, number];
  readonly snap: number;
  readonly format: (value: number) => string;
  readonly group?: string;
}

// ── The entity ───────────────────────────────────────────────────────────────

/**
 * ONE ROW OF THE ROSTER — a SEGMENT or a RAY on the time axis whose measures
 * step at change events.
 *
 *   • `start` — when it begins. Every entity has one.
 *   • `end`   — when it stops, EXCLUSIVE. Present = a segment; absent = a ray
 *               that runs off the right edge of the span.
 *
 * Outside `[start, end)` the entity does not exist and every reading of it is
 * `null` — absence, not zero. A service sold for nothing would still be work; a
 * person on no pay would still be a head on a rail.
 *
 * INSIDE it, `committed` is the measures it opens on and `changes` — keyed by
 * mutation id — is every later event, each an ABSOLUTE set of measures that
 * holds until the next one. An ABSENT key means the entity did not move at that
 * mutation, which is why the history is a map: adding a change needs no edit to
 * anybody's history. A `null` VALUE is the entity being dropped there.
 *
 * `committed === null` is an entity with no opening level — one added through
 * the board's own form, which exists from the change it was added at.
 *
 * `ranges` is the per-entity ALLOWANCE, one per axis. It is NOT the axis
 * domain: the track runs the same width for the whole column.
 */
export interface BoardEntity {
  readonly id: string;
  readonly label: string;
  readonly start: number;
  readonly end?: number;
  readonly committed: readonly number[] | null;
  readonly ranges: readonly (readonly [number, number])[];
  readonly changes: Readonly<Record<string, readonly number[] | null>>;
}

// ── The board ────────────────────────────────────────────────────────────────

/** The two sentences the gauge asks a board for. It supplies no words itself. */
export interface BoardSentences {
  /** Where a rate stands — `$1.3k/wk over breakeven`. */
  readonly against: (rate: number) => string;
  /** What the gap between the needles means — `$20k/yr to payroll`. */
  readonly delta: (rateDelta: number) => string;
}

/**
 * A BOARD, STATED AS DATA.
 *
 * `M` is the number of measures each entity carries, which is the number of
 * axes: 1 for the Scenario Board, 2 for the Hourly Board, 4 for the License
 * Board. It is a type parameter rather than a comment so a fixture with the
 * wrong arity is a compile error rather than a dial reading the wrong number.
 */
export interface BoardConfig<M extends number = number> {
  readonly id: string;
  readonly title: string;
  /** The unit every money figure is quoted in. */
  readonly unit: BoardUnit;
  /** The calendar a change lands on. */
  readonly grain: BoardGrain;
  /** Whether the contribution is money coming IN or going OUT. */
  readonly side: "expense" | "revenue";
  /** The span every chart is drawn against. */
  readonly domain: TimeDomain;
  /** One per measure, in reading order. `length` is `M`. */
  readonly axes: readonly MeasureAxis[];
  /**
   * What ONE entity contributes, in unit terms, from its measures ALONE.
   *
   * Enough for a board whose rate is a function of where its dials are right
   * now, which is both shipped boards: a service bills `hours x rate` in every
   * week it is sold, and a person costs their salary in every month they are
   * employed.
   */
  readonly contributionOf: (measures: readonly number[]) => number;
  /**
   * What ONE entity contributes AT A MOMENT, when its measures alone cannot
   * say — a board whose cash has MEMORY.
   *
   * Peter redefined the License Board on 2026-09-18 into exactly that shape: an
   * annual licence sold in month 0 pays its whole fee in month 0 and nothing
   * again until it renews at +12, and a negative growth delta does not bite
   * until renewal. So what the business bills in March is not a function of
   * where March's dials sit — it is a function of every cohort sold before it.
   *
   * OPTIONAL, and `contributionOf` stays required, because a board that has no
   * memory should not have to write a time-dependent function to say so. When
   * this is present the kit calls it and `contributionOf` is unused; every
   * derivation downstream — the gauge's average, the projection's integral, the
   * calibration table — already samples per moment and needs no other change.
   */
  readonly contributionAt?: (
    entity: BoardEntity,
    time: number,
    mutations: readonly Mutation[],
  ) => number;
  /** What the board is charged regardless of the roster, in unit terms. */
  readonly fixedCost: number;
  /** At or above this gain the gauge lights green; below it, yellow. */
  readonly comfortable: number;
  /** The gauge's own domain. Readings outside it are CLAMPED as it draws. */
  readonly rateDomain: readonly [number, number];
  /** The gauge's two callout lines. */
  readonly sentences: BoardSentences;
  /** Which mix chart the second card draws. */
  readonly mix: "stacked" | "levels";
  /** The roster the board opens on. */
  readonly fixture: readonly BoardEntity[];
  /** The changes the board opens on. */
  readonly seed: readonly Mutation[];
  /** The arity, restated as a value so a runtime check can read it. */
  readonly measures: M;
}

// ── The one line the money comes out of ──────────────────────────────────────

/**
 * THE RATE, from what the roster contributes.
 *
 * The only place a board's `side` is read. See this module's header for why the
 * Scenario Board's payroll and the Hourly Board's revenue are one subtraction
 * taken in two directions rather than two models.
 */
export const rateFromContribution = (
  config: Pick<BoardConfig, "side" | "fixedCost">,
  contribution: number,
): number =>
  config.side === "revenue"
    ? contribution - config.fixedCost
    : config.fixedCost - contribution;

/** Which band a rate reads as. */
export type RateBand = "red" | "yellow" | "green";

/**
 * The band a rate reads as. Mirrors the gauge's own split, so a headless table
 * and the drawn dial cannot disagree: below zero is a loss, below the
 * comfortable gain is a gain that is not yet enough, at or above it is green.
 */
export const bandOfRate = (
  config: Pick<BoardConfig, "comfortable">,
  rate: number,
): RateBand => {
  if (rate < 0) return "red";
  if (rate < config.comfortable) return "yellow";
  return "green";
};

/**
 * What the gauge will actually DRAW for a rate — the domain clamp, named.
 *
 * `RateGauge` applies exactly this before it draws or announces anything, so a
 * consumer whose table must agree with its dial applies it too rather than
 * assuming the two never differ.
 */
export const drawnRate = (
  config: Pick<BoardConfig, "rateDomain">,
  rate: number,
): number =>
  Math.min(Math.max(rate, config.rateDomain[0]), config.rateDomain[1]);

/** Is this rate off the end of the dial? Then a table must say so. */
export const isOffDial = (
  config: Pick<BoardConfig, "rateDomain">,
  rate: number,
): boolean => drawnRate(config, rate) !== rate;
