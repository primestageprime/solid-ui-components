// ============================================
// Table fields — resolver (Depth 1: composes the field-module geometries)
// GEO registry, the col() tail factory, and resolveFields — the compositional
// core of the fields-as-functions system, split from the aggregator so
// FieldTable can compose it without an import cycle.
// ============================================
import type { JSX } from "solid-js";
import type { FieldCol, FieldGeo, FieldSpec, FieldType } from "./shared";
import { centered, floorGeoAtLabel, isFieldGroup } from "./shared";
import { geo as selectionGeo } from "./selection";
import { geo as nameGeo } from "./name";
import { geo as textGeo } from "./text";
import { geo as dateGeo } from "./date";
import { geo as dateTimeGeo } from "./date-time";
import { geo as intGeo } from "./int";
import { geo as floatGeo } from "./float";
import { geo as moneyGeo } from "./money";
import { geo as durationGeo } from "./duration";
import { geo as statusGeo } from "./status";
import { geo as chartGeo } from "./chart";
import { clusterCol } from "./actions";
import { pipe, map, flatMap, sum } from "../../../fn";

/** Geometry registry by field type. `actions` is parameterized by count —
 *  use `geoFor(n)` from ./actions instead. */
export const GEO: Record<Exclude<FieldType, "actions">, FieldGeo> = {
  selection: selectionGeo,
  name: nameGeo,
  text: textGeo,
  date: dateGeo,
  dateTime: dateTimeGeo,
  int: intGeo,
  float: floatGeo,
  money: moneyGeo,
  duration: durationGeo,
  status: statusGeo,
  chart: chartGeo,
};

/** The 5% tail: a weird cell is just a function → JSX. Geometry comes from a
 *  named field type — even the weirdest cell cannot reach CSS. Fixed-width
 *  types center header AND values (ruled 2026-07-17); flowing text stays left. */
export const col = <T,>(
  id: string,
  header: string,
  cell: (row: T) => JSX.Element,
  fieldType: Exclude<FieldType, "actions"> = "status",
  sortValue?: (row: T) => string | number | null | undefined,
): FieldCol<T> => {
  const geo = floorGeoAtLabel(GEO[fieldType], header);
  const flowing = fieldType === "name" || fieldType === "text";
  // Alignment follows the REAL factory of the named geometry (bug 2026-07-21:
  // col() centered numeric customs while intCol/floatCol right-align, so a
  // dotted-header metric column read differently from its plain siblings).
  // Numerics + status right-align; date/dateTime/selection/chart center.
  const numeric =
    fieldType === "int" ||
    fieldType === "float" ||
    fieldType === "money" ||
    fieldType === "duration";
  const align = flowing
    ? undefined
    : numeric || fieldType === "status"
      ? "right"
      : "center";
  return {
    id,
    header: flowing ? header : centered(header),
    align,
    width: geo.css,
    geo,
    sortValue,
    accessor: cell,
  };
};

/** Resolve the compositional gesture against a plain registry object of column
 *  references. Returns the columns plus the table's width budget: render inside
 *  a frame with `min-width: Σ min` / `max-width: Σ max` so the table caps at
 *  Σ max and reads as a dashboard tile, not wallpaper. */
// One sort glyph (▲/⇅ at 10px) plus the header gap, at the frame's mono
// basis. Sortable mode appends it after every sortable label, so the label
// floor must budget for it or the glyph overflows into the next header.
const SORT_INDICATOR_CH = 2;

export interface ResolveFieldsOpts {
  /** Table-level sortable mode: widen every sortValue-carrying column by the
   *  sort-indicator allowance (ruled 2026-07-21). */
  sortable?: boolean;
}

export function resolveFields<T>(
  specs: FieldSpec<T>[],
  registry: Record<string, FieldCol<T>>,
  opts: ResolveFieldsOpts = {},
): {
  columns: FieldCol<T>[];
  minCh: number;
  maxCh: number;
  /** Ready-to-use width budget for the frame vars: calc(Σ content ch + Σ pad). */
  minW: string;
  maxW: string;
} {
  // Resolve one leaf member (a known id or an explicit col) to its column.
  const resolveMember = (member: string | FieldCol<T>): FieldCol<T> =>
    typeof member === "string" ? registry[member] : member;
  // flatMap: a group expands to its member columns, each stamped with the
  // group label so BaseTable merges the consecutive run under one colspan
  // header (ungrouped columns it spans across both rows with rowspan=2).
  const stampGroup =
    (label: string) =>
    (member: string | FieldCol<T>): FieldCol<T> => ({
      ...resolveMember(member),
      group: label,
    });
  const expandSpec = (spec: FieldSpec<T>): FieldCol<T>[] => {
    if (typeof spec === "string") return [registry[spec]];
    if (Array.isArray(spec))
      return [clusterCol(map((id: string) => registry[id], spec))];
    if (isFieldGroup(spec)) return map(stampGroup(spec.group), spec.fields);
    return [spec];
  };
  // Sortable mode budgets the indicator glyph into every sortable column
  // (ruled 2026-07-21) — without it the glyph rides past the label into the
  // neighboring header.
  const widenForSort = (c: FieldCol<T>): FieldCol<T> => {
    if (!opts.sortable || c.sortValue == null) return c;
    const maxCh = c.geo.maxCh + SORT_INDICATOR_CH;
    const geo = {
      ...c.geo,
      minCh: c.geo.minCh + SORT_INDICATOR_CH,
      maxCh,
      css: c.geo.css ? `calc(${maxCh}ch + ${c.geo.padPx ?? 0}px)` : c.geo.css,
    };
    return { ...c, geo, width: geo.css ?? c.width };
  };
  // The width model under table-layout: AUTO (ruled 2026-07-21): every
  // column emits width = its MAX (auto layout's preferred width — the legacy
  // algorithm distributes the surplus over minimums ∝ (preferred − min),
  // which IS the model's range-proportional rule) and min-width = its MIN.
  // Widths include the cell chrome (border-box). A variable column
  // (minCh < maxCh) additionally renders its cells inside the size-contained
  // clip block, so content cannot inflate the minimum past min-width.
  const withModelWidths = (c: FieldCol<T>): FieldCol<T> => {
    const pad = c.geo.padPx ?? 0;
    return {
      ...c,
      width: c.geo.css ?? c.width ?? `calc(${c.geo.maxCh}ch + ${pad}px)`,
      minWidth: `calc(${c.geo.minCh}ch + ${pad}px)`,
      contained: c.geo.maxCh > c.geo.minCh,
    };
  };
  const columns = pipe(
    flatMap(expandSpec, specs),
    map(widenForSort),
    map(withModelWidths),
  );
  const minCh = pipe(columns, map((c) => c.geo.minCh), sum);
  const maxCh = pipe(columns, map((c) => c.geo.maxCh), sum);
  const padPx = pipe(columns, map((c) => c.geo.padPx ?? 0), sum);
  // The fixed-layout floor: a column with a css width CONSUMES that width
  // outright (fixed layout never content-fits it down to minCh), so the
  // table's minimum is Σ css-widths plus the expanding columns' minCh —
  // summing raw minCh would leave the expanding columns' share underwater
  // and fixed layout would crush them to nothing.
  const floorCh = columns.reduce(
    (s, c) => s + (c.geo.css ? c.geo.maxCh : c.geo.minCh),
    0,
  );
  return {
    columns,
    minCh,
    maxCh,
    minW: `calc(${floorCh}ch + ${padPx}px)`,
    maxW: `calc(${maxCh}ch + ${padPx}px)`,
  };
}
