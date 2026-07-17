// ============================================
// Table fields — shared contract (Depth 0, no component imports)
// The fields-as-functions table system (ruled 2026-07-17): a known field is a
// column-returning factory; a registry is a plain object of column references;
// the client contract is an ordered gesture of field ids. Field type owns ALL
// geometry (width/align/header-align) in ch/em so it scales with zoom — the
// client can never reach CSS. See docs/superpowers/plans/
// 2026-07-16-semantic-props-metric.md §3a.
// ============================================
import type { JSX } from "solid-js";
import type { TableColumn } from "../types";
import "./shared.css";

export type FieldType =
  | "selection"
  | "name"
  | "text"
  | "date"
  | "dateTime"
  | "int"
  | "float"
  | "money"
  | "duration"
  | "status"
  | "chart"
  | "actions";

/** Geometry contract for one field type. Widths are TOTAL column widths under
 *  `table-layout: fixed` — content basis plus cell chrome (16px ≈ 2ch padding
 *  per side). ch/em only, never px: columns scale with theme font-size and
 *  browser zoom. min === max is a fixed column; name/text expand between
 *  bounds; numeric types content-fit up to their cap. */
export interface FieldGeo {
  minCh: number;
  maxCh: number;
  /** CSS width the factory applies internally — clients never see it.
   *  Absent for expanding columns (they flex; `ellipsis` caps them). */
  css?: string;
}

/** A resolved field column: the TableColumn plus its geometry. */
export type FieldCol<T> = TableColumn<T> & { geo: FieldGeo };

/** A fields entry: a known id, an action-id cluster, or an explicit column. */
export type FieldSpec<T> = string | string[] | FieldCol<T>;

/** "amountCents" → "Amount": humanized field label; storage-unit and
 *  timestamp suffixes are implementation detail, not labels. */
export const humanize = (id: string): string =>
  id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/ At$/, "")
    .replace(/ Cents$/, "");

/** Header alignment by field type (ruled 2026-07-17): LEFT for flowing text,
 *  CENTER for fixed-width text/icons. Values keep their own alignment. */
export const centered = (label: string): JSX.Element => (
  <span class="sui-field-th-center">{label}</span>
);

export const behaviorOf = (g: FieldGeo): "fixed" | "expands" | "content-fit" =>
  g.minCh === g.maxCh ? "fixed" : g.css == null ? "expands" : "content-fit";
