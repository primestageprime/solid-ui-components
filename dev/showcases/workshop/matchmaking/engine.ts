// ============================================
// Matchmaking bench — FILTER ENGINE
//
// Pure functions over flat rows. No Solid, no DOM, no components — the visual
// pieces never import this, and it never imports them. The bench is the only
// place the two meet.
//
// Semantics: OR within a filter, AND across filters.
//   (region=Midwest OR region=PNW) AND (intimacy=4)
// Uniform across direct and set-valued dimensions alike.
// ============================================
import { filter, map, pipe, sortBy } from "../../../../src/fn";
import type { Dataset, Outing } from "./types";
import {
  DIMENSIONS,
  type Dimension,
  type DimensionId,
  dimensionById,
} from "./dimensions";

/** Absent key or empty array both mean "no filter on this dimension". */
export type FilterState = Record<DimensionId, string[]>;

export interface FacetRow {
  value: string;
  label: string;
  cells: (string | number)[];
  count: number;
}

export interface FacetTableModel {
  id: DimensionId;
  label: string;
  columns: Dimension["columns"];
  rows: FacetRow[];
  activeValues: string[];
}

const activeEntries = (state: FilterState): [DimensionId, string[]][] =>
  pipe(
    Object.entries(state),
    filter(([, values]: [string, string[]]) => values.length > 0),
  );

const matchesDimension = (
  outing: Outing,
  dimension: Dimension,
  selected: string[],
): boolean => {
  const values = dimension.valuesOf(outing);
  for (const value of values) {
    if (selected.includes(value)) return true; // OR within
  }
  return false;
};

/**
 * Apply every active filter, optionally skipping one dimension.
 *
 * `exceptDimension` is the load-bearing parameter. A facet table for
 * dimension D must NOT have D's own filter applied to it — otherwise, once
 * you pick Midwest, every other region shows a count of zero and a second
 * region can never be selected. Filters from all OTHER dimensions still
 * narrow it normally.
 */
export const applyFilters = (
  outings: Outing[],
  state: FilterState,
  exceptDimension?: DimensionId,
): Outing[] => {
  const entries = pipe(
    activeEntries(state),
    filter(([id]: [DimensionId, string[]]) => id !== exceptDimension),
  );
  if (entries.length === 0) return outings;

  // Resolve dimensions once, not per row.
  const active = pipe(
    entries,
    map(([id, selected]: [DimensionId, string[]]) => ({
      dimension: dimensionById.get(id),
      selected,
    })),
    filter((entry) => entry.dimension !== undefined),
  );

  const matchesAll = (outing: Outing): boolean => {
    for (const { dimension, selected } of active) {
      // AND across dimensions — any miss disqualifies the row.
      if (!matchesDimension(outing, dimension as Dimension, selected)) return false;
    }
    return true;
  };

  return filter(matchesAll, outings);
};

/**
 * Rows for one facet table, counted against every filter except this
 * dimension's own. Sorted by count descending so the long-tail dimensions
 * (activity, composition, people) lead with something worth reading.
 */
export const facetRows = (
  data: Dataset,
  state: FilterState,
  dimension: Dimension,
): FacetRow[] => {
  const scope = applyFilters(data.outings, state, dimension.id);

  const buckets = new Map<string, Outing[]>();
  for (const outing of scope) {
    for (const value of dimension.valuesOf(outing)) {
      const bucket = buckets.get(value);
      if (bucket) bucket.push(outing);
      else buckets.set(value, [outing]);
    }
  }

  const rows: FacetRow[] = [];
  for (const [value, bucket] of buckets) {
    rows.push({
      value,
      label: dimension.labelOf(value, data),
      cells: dimension.cells(bucket, data),
      count: bucket.length,
    });
  }

  return pipe(
    rows,
    sortBy((row: FacetRow) => -row.count),
  );
};

export const facetTables = (
  data: Dataset,
  state: FilterState,
): FacetTableModel[] =>
  map(
    (dimension: Dimension) => ({
      id: dimension.id,
      label: dimension.label,
      columns: dimension.columns,
      rows: facetRows(data, state, dimension),
      activeValues: state[dimension.id] ?? [],
    }),
    DIMENSIONS,
  );

// ─── State transitions ───────────────────────────────────────────────────
// Plain immutable updates. The bench holds these in a signal; nothing else
// mutates filter state.

export const addFilter = (state: FilterState, id: DimensionId): FilterState =>
  id in state ? state : { ...state, [id]: [] };

export const removeFilter = (state: FilterState, id: DimensionId): FilterState => {
  const next = { ...state };
  delete next[id];
  return next;
};

export const addTerm = (
  state: FilterState,
  id: DimensionId,
  value: string,
): FilterState => {
  const current = state[id] ?? [];
  return current.includes(value)
    ? state
    : { ...state, [id]: [...current, value] };
};

/** Removing the last term removes the whole filter — an empty group is noise. */
export const removeTerm = (
  state: FilterState,
  id: DimensionId,
  value: string,
): FilterState => {
  const current = state[id] ?? [];
  const next = filter((v: string) => v !== value, current);
  return next.length === 0 && current.length > 0
    ? removeFilter(state, id)
    : { ...state, [id]: next };
};

/** Cell clicks toggle: in → out, out → in, creating the filter if absent. */
export const toggleTerm = (
  state: FilterState,
  id: DimensionId,
  value: string,
): FilterState =>
  (state[id] ?? []).includes(value)
    ? removeTerm(state, id, value)
    : addTerm(state, id, value);

export const clearAll = (): FilterState => ({});

export const activeFilterCount = (state: FilterState): number =>
  activeEntries(state).length;
