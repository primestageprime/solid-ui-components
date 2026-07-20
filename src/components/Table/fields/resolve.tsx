// ============================================
// Table fields — resolver (Depth 1: composes the field-module geometries)
// GEO registry, the col() tail factory, and resolveFields — the compositional
// core of the fields-as-functions system, split from the aggregator so
// FieldTable can compose it without an import cycle.
// ============================================
import type { JSX } from "solid-js";
import type { FieldCol, FieldGeo, FieldSpec, FieldType } from "./shared";
import { centered, isFieldGroup } from "./shared";
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
import { pipe, map, sum } from "../../../fn";

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
  const geo = GEO[fieldType];
  const flowing = fieldType === "name" || fieldType === "text";
  // status reads as a trailing indicator: values right-align (ruled 2026-07-17)
  const align = flowing ? undefined : fieldType === "status" ? "right" : "center";
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
export function resolveFields<T>(
  specs: FieldSpec<T>[],
  registry: Record<string, FieldCol<T>>,
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
  const columns = specs.flatMap((spec): FieldCol<T>[] => {
    if (typeof spec === "string") return [registry[spec]];
    if (Array.isArray(spec)) return [clusterCol(spec.map((id) => registry[id]))];
    if (isFieldGroup(spec))
      return spec.fields.map((member) => ({
        ...resolveMember(member),
        group: spec.group,
      }));
    return [spec];
  });
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
