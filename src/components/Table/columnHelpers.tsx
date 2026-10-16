// lastReviewedAt: 2026-10-16
// lastReviewedBy: veronica
// ============================================
// Column helpers — Atomic (Depth 1: compose the cell renderers).
//
// Canon (Peter, 2026-10-16): a table column ALWAYS goes through a value
// renderer, never a bare accessor, and a date or number column has a FIXED
// width scaled to the size of its data — so a date can never wrap onto two
// lines. These helpers are how a `BaseTable` column meets that rule:
//
//   dateTimeCol("hour", "Hour", { data: rows, precision: "minute" })
//   intCol("samples", "Samples", { data: rows })
//   textCol("vessel", "Vessel", { ellipsis: true })      // takes the remainder
//
// WIDTH FROM DATA. Pass the rows as `data` (the helper reads the field the
// same way its accessor does) or the already-extracted `values`. The width is
// the longest RENDERED value — what the cell actually paints: "1,234" not
// 1234, "2026-01-15 08:00" not the ISO string — in `ch`, floored at the header
// label, plus the cell's horizontal padding (`CELL_PAD_PX`). `ch` keeps the
// column proportional under zoom and theme font-size, as in Table/fields.
// Dates are special: their rendered length is fixed by the pattern, so a date
// column with no sample still sizes itself from the pattern. With neither
// `data` nor `values` the other helpers keep their pre-2026-10-16 defaults
// (`dateTimeCol` 160px; `intCol`/`floatCol`/`textCol` unsized), so existing
// call sites render exactly as before. An explicit `width` always wins.
//
// SORTING. Every helper sets `sortValue` to the raw field value, because the
// accessor returns JSX and BaseTable cannot compare rendered cells. (Before
// 2026-10-16 the helpers set `sortable` without `sortValue`, so a sortable
// helper column sorted its JSX — i.e. not at all.)
// ============================================
import type { JSX } from "solid-js";
import {
  FloatCell,
  IntCell,
  DateTimeCell,
  DateCell,
  StringCell,
  StatusCell,
  type StatusCellProps,
} from "./CellRenderers";
import {
  DATE_PATTERN,
  DATETIME_PATTERN,
  MINUTE_DATETIME_PATTERN,
  formatDateValue,
} from "./dateCells";
import { formatFloatValue, formatIntValue } from "./numericCells";
import { map } from "../../fn";
import type { TableColumn } from "./types";

/** Horizontal cell padding BaseTable paints (`.hud-table__cell` is 16px a
 *  side), summed. A derived width is content ch + this, so the glyphs fit
 *  inside the padding instead of being clipped by it. */
export const CELL_PAD_PX = 32;

/** The empty marker every value renderer paints for null — 1ch wide. */
const EMPTY_MARK = "—";

/** Header cells are uppercase with 0.1em tracking, so a label needs ~17% more
 *  room than its character count (same budget as Table/fields `headerCh`). */
const HEADER_TRACKING = 1.17;

/** Column options shared by every helper. `width` beats `data`/`values`;
 *  `data` and `values` are two ways to hand over the same sample. */
export interface ColOpts<T, V> {
  /** Where the value comes from — a row key or a derived reader. Defaults to
   *  the column id as a key. */
  field?: keyof T | ((row: T) => V);
  /** Explicit CSS width. Set, it overrides any derived width. */
  width?: string;
  /** Rows to size the column from — the helper reads `field` off each. */
  data?: Iterable<T>;
  /** Already-extracted values to size the column from. */
  values?: Iterable<V>;
  sortable?: boolean;
  /** Group label for a two-row grouped header (`TableColumn.group`). */
  group?: string;
  /** Clip with an ellipsis even without a width — the flexible column in a
   *  `fixedLayout` table (`TableColumn.ellipsis`). */
  ellipsis?: boolean;
  /** Size-contained clip block (`TableColumn.contained`). */
  contained?: boolean;
  /** Override the helper's alignment (numbers right, text left). */
  align?: TableColumn<T>["align"];
}

function resolve<T, V>(
  id: string,
  field: keyof T | ((row: T) => V) | undefined,
  row: T,
): V {
  const accessor = field ?? (id as keyof T);
  return typeof accessor === "function" ? accessor(row) : (row[accessor] as V);
}

/** The sample a helper sizes from: `values` as given, else `field` read off
 *  every row of `data`, else nothing. */
function sampleOf<T, V>(
  id: string,
  opts: ColOpts<T, V> | undefined,
): V[] | null {
  if (opts?.values) return Array.from(opts.values);
  if (opts?.data) {
    const out: V[] = [];
    for (const row of opts.data) out.push(resolve(id, opts.field, row));
    return out;
  }
  return null;
}

/** Width in `ch` a column needs for `rendered` texts under `header`: the
 *  longest text (a null renders as the 1ch empty mark), floored at the
 *  header's tracked length. Pure; exported so the rule is testable. */
export function columnCh(
  rendered: Iterable<string | null>,
  header: string | JSX.Element,
): number {
  let max = 0;
  for (const text of rendered) {
    const len = text == null ? EMPTY_MARK.length : text.length;
    if (len > max) max = len;
  }
  const label = typeof header === "string" ? header : "";
  return Math.max(max, Math.ceil(label.length * HEADER_TRACKING));
}

/** The CSS width for a column painting `rendered` under `header`:
 *  `calc(<ch>ch + <CELL_PAD_PX>px)`. */
export function widthForValues(
  rendered: Iterable<string | null>,
  header: string | JSX.Element,
): string {
  return `calc(${columnCh(rendered, header)}ch + ${CELL_PAD_PX}px)`;
}

/** Resolve a helper's width: explicit > derived from the sample > fallback. */
function widthOf<T, V>(
  id: string,
  header: string | JSX.Element,
  opts: ColOpts<T, V> | undefined,
  render: (value: V) => string | null,
  fallback: string | undefined,
): string | undefined {
  if (opts?.width) return opts.width;
  const sample = sampleOf(id, opts);
  if (sample) return widthForValues(map(render, sample), header);
  return fallback;
}

/** The TableColumn fields every helper passes through from its opts. */
function passthrough<T, V>(opts: ColOpts<T, V> | undefined) {
  return {
    sortable: opts?.sortable,
    group: opts?.group,
    ellipsis: opts?.ellipsis,
    contained: opts?.contained,
  };
}

// ── Base helpers ──────────────────────────────────────────────

export function floatCol<T>(
  id: string,
  header: string,
  precision = 2,
  opts?: ColOpts<T, number | null>,
): TableColumn<T> {
  return {
    id,
    header,
    align: opts?.align ?? "right",
    width: widthOf(
      id,
      header,
      opts,
      (v) => formatFloatValue(v, precision),
      undefined,
    ),
    ...passthrough(opts),
    sortValue: (row) => resolve(id, opts?.field, row),
    accessor: (row) => (
      <FloatCell value={resolve(id, opts?.field, row)} precision={precision} />
    ),
  };
}

export function intCol<T>(
  id: string,
  header: string,
  opts?: ColOpts<T, number | null>,
): TableColumn<T> {
  return {
    id,
    header,
    align: opts?.align ?? "right",
    width: widthOf(id, header, opts, (v) => formatIntValue(v), undefined),
    ...passthrough(opts),
    sortValue: (row) => resolve(id, opts?.field, row),
    accessor: (row) => <IntCell value={resolve(id, opts?.field, row)} />,
  };
}

export interface DateTimeColOpts<T> extends ColOpts<T, string | null> {
  /** `"second"` (default) paints `YYYY-MM-DD HH:mm:ss`; `"minute"` drops the
   *  seconds. The column is sized from the pattern even with no sample. */
  precision?: "second" | "minute";
  /** IANA zone to render in (default: host local). */
  timeZone?: string;
}

/** Whether `DateTimeCell` shows seconds for a `precision` (its `showSeconds`, which defaults on). */
export const showSecondsFor = (precision?: "minute" | "second"): boolean =>
  precision !== "minute";

/** Legacy default width, kept for call sites that pass neither `data` nor
 *  `values` nor `precision` — those render exactly as before 2026-10-16. */
const DATETIME_LEGACY_WIDTH = "160px";

export function dateTimeCol<T>(
  id: string,
  header: string,
  opts?: DateTimeColOpts<T>,
): TableColumn<T> {
  const pattern =
    opts?.precision === "minute" ? MINUTE_DATETIME_PATTERN : DATETIME_PATTERN;
  const render = (v: string | null) =>
    formatDateValue(v, pattern, opts?.timeZone);
  // A date's rendered length is fixed by its pattern: with no sample, size
  // from the pattern itself (except the legacy no-opts form, which keeps 160px).
  const fallback =
    opts?.precision === undefined
      ? DATETIME_LEGACY_WIDTH
      : widthForValues([pattern], header);
  return {
    id,
    header,
    align: opts?.align,
    width: widthOf(id, header, opts, render, fallback),
    ...passthrough(opts),
    sortValue: (row) => resolve(id, opts?.field, row),
    accessor: (row) => (
      <DateTimeCell
        value={resolve(id, opts?.field, row)}
        showSeconds={showSecondsFor(opts?.precision)}
        timeZone={opts?.timeZone}
      />
    ),
  };
}

export interface DateColOpts<T> extends ColOpts<T, string | null> {
  /** IANA zone to render in (default: host local). */
  timeZone?: string;
}

export function dateCol<T>(
  id: string,
  header: string,
  opts?: DateColOpts<T>,
): TableColumn<T> {
  const render = (v: string | null) =>
    formatDateValue(v, DATE_PATTERN, opts?.timeZone);
  // Sized from the pattern when there is no sample — a date never wraps.
  // (Before 2026-10-16 dateCol had no default width at all.)
  const fallback = widthForValues([DATE_PATTERN], header);
  return {
    id,
    header,
    align: opts?.align,
    width: widthOf(id, header, opts, render, fallback),
    ...passthrough(opts),
    sortValue: (row) => resolve(id, opts?.field, row),
    accessor: (row) => (
      <DateCell
        value={resolve(id, opts?.field, row)}
        timeZone={opts?.timeZone}
      />
    ),
  };
}

export function textCol<T>(
  id: string,
  header: string,
  opts?: ColOpts<T, string | null | undefined>,
): TableColumn<T> {
  return {
    id,
    header,
    align: opts?.align,
    width: widthOf(id, header, opts, (v) => v ?? null, undefined),
    ...passthrough(opts),
    sortValue: (row) => resolve(id, opts?.field, row),
    accessor: (row) => <StringCell value={resolve(id, opts?.field, row)} />,
  };
}

export interface StatusColOpts<T>
  extends ColOpts<T, string | null | undefined> {
  /** Status → label/variant map handed to StatusCell. */
  statusMap?: StatusCellProps["statusMap"];
}

/** Badge chrome StatusCell paints around its label (padding + border), in ch. */
const STATUS_BADGE_CH = 3;

/** A status-badge column via StatusCell. Sized from the LABELS it paints (the
 *  mapped label when `statusMap` has one, else the raw value) plus badge
 *  chrome; unsized with no sample, as before. */
export function statusCol<T>(
  id: string,
  header: string,
  opts?: StatusColOpts<T>,
): TableColumn<T> {
  // StatusCell looks the value up LOWERCASED — measure the label it will paint.
  const label = (v: string | null | undefined) =>
    v == null ? null : (opts?.statusMap?.[v.toLowerCase()]?.label ?? v);
  const chrome = "#".repeat(STATUS_BADGE_CH);
  return {
    id,
    header,
    align: opts?.align,
    width: widthOf(
      id,
      header,
      opts,
      (v) => {
        const text = label(v);
        return text == null ? null : text + chrome;
      },
      undefined,
    ),
    ...passthrough(opts),
    sortValue: (row) => resolve(id, opts?.field, row),
    accessor: (row) => (
      <StatusCell
        value={resolve(id, opts?.field, row)}
        statusMap={opts?.statusMap}
      />
    ),
  };
}

// ── Curried factories — bake in defaults, return a simpler function ──

export function floatColWith(defaults: {
  width?: string;
  sortable?: boolean;
  precision?: number;
}) {
  return <T,>(
    id: string,
    header: string,
    precision?: number,
    opts?: ColOpts<T, number | null>,
  ): TableColumn<T> =>
    floatCol<T>(id, header, precision ?? defaults.precision ?? 2, {
      ...defaults,
      ...opts,
    });
}

export function intColWith(defaults: { width?: string; sortable?: boolean }) {
  return <T,>(
    id: string,
    header: string,
    opts?: ColOpts<T, number | null>,
  ): TableColumn<T> => intCol<T>(id, header, { ...defaults, ...opts });
}

export function dateTimeColWith(defaults: {
  width?: string;
  sortable?: boolean;
  precision?: "second" | "minute";
  timeZone?: string;
}) {
  return <T,>(
    id: string,
    header: string,
    opts?: DateTimeColOpts<T>,
  ): TableColumn<T> => dateTimeCol<T>(id, header, { ...defaults, ...opts });
}

export function textColWith(defaults: { width?: string; sortable?: boolean }) {
  return <T,>(
    id: string,
    header: string,
    opts?: ColOpts<T, string | null | undefined>,
  ): TableColumn<T> => textCol<T>(id, header, { ...defaults, ...opts });
}
