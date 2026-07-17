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
  /** CONTENT width bounds in ch (glyphs only — padding is NOT included). */
  minCh: number;
  maxCh: number;
  /** Horizontal cell padding (both sides summed, px) this column adds on top
   *  of its content ch. 16 for text columns under the field-frame's 8px/side
   *  chrome; 0 for rem-sized columns whose css is already the total width. */
  padPx?: number;
  /** CSS width the factory applies internally — clients never see it. Cells
   *  are border-box, so text columns use `calc(<content>ch + <pad>px)`.
   *  Absent for expanding columns (they flex; `ellipsis` caps them). */
  css?: string;
}

/** A resolved field column: the TableColumn plus its geometry. */
export type FieldCol<T> = TableColumn<T> & { geo: FieldGeo };

/** Semantic treatment for a cell value (ruled 2026-07-17): columns may be
 *  configured with a function (value, row) → Tone at REGISTRY time; the tone
 *  maps to theme color inside SUI. The client names a meaning, never a color. */
export type Tone = "default" | "success" | "warning" | "danger" | "accent" | "muted";

/** Configure-time treatment function: derives a Tone from the cell's value. */
export type ToneFn<T, V> = (value: V, row: T) => Tone;

/** Wrap a cell in its tone class ("default" and absent tone add nothing). */
export const toneWrap = (tone: Tone | undefined, cell: JSX.Element): JSX.Element =>
  tone && tone !== "default" ? (
    <span class={`sui-field-tone--${tone}`}>{cell}</span>
  ) : (
    cell
  );

/** A fields entry: a known id, an action-id cluster, or an explicit column. */
export type FieldSpec<T> = string | string[] | FieldCol<T>;

/** "amountCents" → "Amount", "metric_id" → "Metric Id": humanized field label
 *  from camelCase or snake_case; storage-unit and timestamp suffixes are
 *  implementation detail, not labels. */
export const humanize = (id: string): string =>
  id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_+/g, " ")
    .replace(/(^|\s)[a-z]/g, (c) => c.toUpperCase())
    .replace(/ At$/, "")
    .replace(/ Cents$/, "");

/** Header alignment by field type (ruled 2026-07-17): LEFT for flowing text,
 *  CENTER for fixed-width text/icons. Values keep their own alignment. */
export const centered = (label: string): JSX.Element => (
  <span class="sui-field-th-center">{label}</span>
);

export const behaviorOf = (g: FieldGeo): "fixed" | "expands" | "content-fit" =>
  g.minCh === g.maxCh ? "fixed" : g.css == null ? "expands" : "content-fit";
