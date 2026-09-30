// Payroll board — the CHANGES section's model. Pure; no Solid, no DOM.
//
// Element 4, the change sliders (Peter, 2026-09-24): one dial per person, the
// prior arrow at their baseline pay and the future arrow at what the scenario
// pays them, fed by the SAME staff and events fixture the Events section draws
// (read from events-model, never copied).
//
// LINK PERSISTENCE IS THE BENCH'S, not the component's. `MutationSliders` is
// controlled — it is handed `linkedIds` and reports the next list — and this
// file is what a consumer writes around it: the list in localStorage, keyed by
// scenario id, cleared on save and on reset, and every read and write wrapped
// so a browser that refuses storage (private window, blocked site data)
// degrades to the in-memory list the section already holds. `Storage` is a
// parameter so the fallback is testable.
import type { Entity } from "../../../../src/components/MutationSliders";
import { filter, find, flatMap, join, map, sortBy } from "../../../../src/fn";
import { BASELINE, PAY_EVENTS, type PayChange, type PayEvent } from "./events-model";

/** The scenarios the bench can switch between. The link key is per id. */
export const SCENARIOS = [
  { id: "plan-a", label: "Plan A" },
  { id: "plan-b", label: "Plan B" },
] as const;
export type ScenarioId = (typeof SCENARIOS)[number]["id"];

/** Everyone's allowed range. Person 3's lower ceiling shows a split group. */
const RANGE: readonly [number, number] = [70_000, 130_000];
const CEILINGS: Readonly<Record<string, number>> = { "Person 3": 115_000 };

const idOf = (person: string): string => person;

/** What a person is paid once every event up to the end has applied. */
const finalPay = (
  person: string,
  events: readonly PayEvent[],
): number | null => {
  const changes = flatMap(
    (event: PayEvent) =>
      filter((change: PayChange) => change.person === person, event.changes),
    sortBy((event: PayEvent) => event.at, events),
  );
  const last = changes[changes.length - 1];
  const base = find((change: PayChange) => change.person === person, BASELINE);
  return last === undefined ? (base?.pay ?? null) : last.pay;
};

/**
 * One dial per person, baseline staff first, then hires in event order: the
 * prior is their baseline pay (`null` for a hire, which draws as New), the
 * future is where the events leave them.
 */
export const staffOf = (events: readonly PayEvent[] = PAY_EVENTS): readonly Entity[] => {
  const hires = map(
    (change: PayChange) => change.person,
    filter(
      (change: PayChange) =>
        find((base: PayChange) => base.person === change.person, BASELINE) ===
        undefined,
      flatMap((event: PayEvent) => event.changes, sortBy((e: PayEvent) => e.at, events)),
    ),
  );
  const people = [...map((base: PayChange) => base.person, BASELINE), ...new Set(hires)];
  return map(
    (person: string) => ({
      id: idOf(person),
      label: person,
      old: find((base: PayChange) => base.person === person, BASELINE)?.pay ?? null,
      value: finalPay(person, events),
      range: [RANGE[0], CEILINGS[person] ?? RANGE[1]] as const,
    }),
    people,
  );
};

/**
 * ONE PERSON, TWO DIALS (Peter, 2026-09-24): Person 3 also holds a second,
 * part-time EVENING position, paid separately — two positions rather than
 * salary + stipend because a stipend (a few $K) is invisible on a track that
 * runs to $130K, while a part-time role sits on the same scale as a salary.
 * `item` says which dials are one person; the dial right after Person 3's
 * main one is the second position.
 *
 * Its range floor (40k) is below everyone else's (70k), so the row's derived
 * track widens to start at 40k.
 */
export interface PositionDial extends Entity {
  readonly item: string;
}

export const positionsOf = (
  entities: readonly Entity[] = staffOf(),
): readonly PositionDial[] =>
  flatMap(
    (entity: Entity) =>
      entity.id === "Person 3"
        ? [
            { ...entity, item: entity.id },
            {
              id: "Person 3 · evening",
              label: "Evening",
              old: 45_000,
              value: 50_000,
              range: [40_000, 60_000] as const,
              item: entity.id,
            },
          ]
        : [{ ...entity, item: entity.id }],
    entities,
  );

/** The row with one person's future amount replaced. */
export const setValue = (
  entities: readonly Entity[],
  id: string,
  value: number | null,
): readonly Entity[] =>
  map((entity: Entity) => (entity.id === id ? { ...entity, value } : entity), entities);

/**
 * Reset one dial: back to its prior amount. A hire has no prior, so its reset
 * is the SAVED amount it came in at — resetting a hire must not delete them.
 */
export const resetOne = (
  entities: readonly Entity[],
  saved: readonly Entity[],
  id: string,
): readonly Entity[] => {
  const was = find((entity: Entity) => entity.id === id, saved);
  return setValue(entities, id, was?.old ?? was?.value ?? null);
};

/**
 * [Add]: a new hire at the lowest pay, appended — `old: null`, so it draws as
 * New. Named past the highest "Person N" already in the row, so an add after a
 * delete never reuses a name that is still somewhere in the saved scenario.
 */
export const addPerson = (entities: readonly Entity[]): readonly Entity[] => {
  const highest = Math.max(
    0,
    ...map(
      (entity: Entity) => Number(/^Person (\d+)$/.exec(entity.id)?.[1] ?? 0),
      entities,
    ),
  );
  const person = `Person ${highest + 1}`;
  return [
    ...entities,
    { id: idOf(person), label: person, old: null, value: 80_000, range: RANGE },
  ];
};

// ── link persistence ─────────────────────────────────────────────────────

/** The localStorage key for one scenario's link list. */
export const linkKey = (scenario: string): string =>
  `sui:payroll-board:links:${scenario}`;

/** The browser's localStorage, or `undefined` where touching it throws. */
export const browserStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

/** The stored link list for a scenario; `[]` for none, garbage, or no storage. */
export const readLinks = (
  storage: Storage | undefined,
  scenario: string,
): readonly string[] => {
  try {
    const raw = storage?.getItem(linkKey(scenario));
    if (raw === null || raw === undefined) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? filter((id: unknown): id is string => typeof id === "string", parsed)
      : [];
  } catch {
    return [];
  }
};

/**
 * Store a scenario's link list. An empty list REMOVES the key rather than
 * storing `[]`, so a cleared scenario leaves nothing behind. Failure is
 * silent: the section's in-memory list is still the truth for this page.
 */
export const writeLinks = (
  storage: Storage | undefined,
  scenario: string,
  ids: readonly string[],
): void => {
  try {
    if (ids.length === 0) storage?.removeItem(linkKey(scenario));
    else storage?.setItem(linkKey(scenario), JSON.stringify(ids));
  } catch {
    // Storage refused (quota, private mode) — the in-memory list stands.
  }
};

/**
 * A STORED link list checked against the values it is loaded onto (Peter's
 * rule: "if they can't be at the same level, unlink"). Links persist across a
 * refresh and the values do not, so a group can come back un-level.
 *
 * The group's level is the one MOST members stand at, ties going to the
 * highest (the level a link snaps up to). Members elsewhere — and removed or
 * vanished ones — drop out, and a group left under two dissolves. Pure, and it
 * never moves a value: re-levelling on load would dirty the scenario.
 */
export const validateLinks = (
  entities: readonly Entity[],
  selected: readonly string[],
): readonly string[] => {
  const valueOf = (id: string): number | null =>
    find((entity: Entity) => entity.id === id, entities)?.value ?? null;
  const present = filter((id: string) => valueOf(id) !== null, selected);
  const counts = new Map<number, number>();
  for (const id of present) {
    const value = valueOf(id) as number;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let level: number | null = null;
  let best = 0;
  for (const [value, count] of counts) {
    if (count > best || (count === best && level !== null && value > level)) {
      level = value;
      best = count;
    }
  }
  const kept = filter((id: string) => valueOf(id) === level, present);
  return kept.length < 2 ? [] : kept;
};

// ── the headless observation ─────────────────────────────────────────────

const k = (value: number | null): string =>
  value === null ? "—" : `${value / 1000}k`;

/** The row as a text table: who is where, and who is linked. */
export const observeChanges = (
  entities: readonly Entity[],
  links: readonly string[],
  scenario: string,
): string =>
  join("\n", [
    `scenario ${scenario}  links [${join(", ", links)}]`,
    "person     old     new   ceiling  linked",
    ...map(
      (entity: Entity) =>
        join("  ", [
          entity.label.padEnd(9),
          k(entity.old).padStart(6),
          k(entity.value).padStart(6),
          k(entity.range[1]).padStart(7),
          find((id: string) => id === entity.id, links) ? "  ⛓" : "",
        ]),
      entities,
    ),
  ]);
