// ============================================
// Table fields — resolver (Depth 1: composes the field-module geometries)
// GEO registry, the col() tail factory, and resolveFields — the compositional
// core of the fields-as-functions system, split from the aggregator so
// FieldTable can compose it without an import cycle.
// ============================================
import type { JSX } from "solid-js";
import type { FieldCol, FieldGeo, FieldSpec, FieldType } from "./shared";
import { centered } from "./shared";
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
  const columns = specs.map((spec) => {
    if (typeof spec === "string") return registry[spec];
    if (Array.isArray(spec)) return clusterCol(spec.map((id) => registry[id]));
    return spec;
  });
  const minCh = columns.reduce((s, c) => s + c.geo.minCh, 0);
  const maxCh = columns.reduce((s, c) => s + c.geo.maxCh, 0);
  const padPx = columns.reduce((s, c) => s + (c.geo.padPx ?? 0), 0);
  return {
    columns,
    minCh,
    maxCh,
    minW: `calc(${minCh}ch + ${padPx}px)`,
    maxW: `calc(${maxCh}ch + ${padPx}px)`,
  };
}
