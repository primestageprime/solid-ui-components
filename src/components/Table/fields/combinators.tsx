// Table fields — column combinators (Depth 1: composes Tooltip).
// Function-first wrappers over a built FieldCol (ruled 2026-07-20): instead
// of growing an option on every factory, a combinator decorates ANY column.
// Dual form like fn: direct `withHref(href, col)`, curried `withHref(href)`.
//
// - withHref: the cell content becomes a link (bucket-count drilldowns, week
//   links, a statusCol badge with a spreadsheet href). Identity NAMES keep
//   using identityLinkCol; this is for non-identity linked values.
// - withHint: the header grows a themed tooltip ("headers generally accept a
//   hint; if we don't specify it, fine" — ruled 2026-07-20). Dotted-underline
//   affordance; the header text itself is unchanged.
// - withWhen: the cell renders only when the predicate holds — blank
//   otherwise (ruled 2026-07-20: per-row colspan takeovers collapse to
//   predicate-gated columns; a partial week blanks its stat cells and shows
//   the row action instead). Header, geometry, and sort are untouched.
import type { JSX } from "solid-js";
import { Tooltip } from "../../Tooltip";
import type { FieldCol } from "./shared";

const cellOf = <T,>(column: FieldCol<T>): ((row: T) => JSX.Element) => {
  const accessor = column.accessor;
  if (typeof accessor === "function") return accessor;
  return (row) => row[accessor] as JSX.Element;
};

export function withHref<T>(
  href: (row: T) => string | null | undefined,
  column: FieldCol<T>,
): FieldCol<T>;
export function withHref<T>(
  href: (row: T) => string | null | undefined,
): (column: FieldCol<T>) => FieldCol<T>;
export function withHref<T>(
  href: (row: T) => string | null | undefined,
  column?: FieldCol<T>,
): FieldCol<T> | ((column: FieldCol<T>) => FieldCol<T>) {
  if (column === undefined) return (c) => withHref(href, c);
  const cell = cellOf(column);
  return {
    ...column,
    accessor: (row) => {
      // No destination → the plain cell, never a dead link (same ruling as
      // identityLinkCol's blank-name case). Configure-time nulls are how a
      // caller says "this row doesn't navigate" (missing spreadsheet URL,
      // zero-count bucket).
      const url = href(row);
      if (url == null || url === "") return cell(row);
      return (
        <a class="sui-field-link" href={url}>
          {cell(row)}
        </a>
      );
    },
  };
}

export function withWhen<T>(
  pred: (row: T) => boolean,
  column: FieldCol<T>,
): FieldCol<T>;
export function withWhen<T>(
  pred: (row: T) => boolean,
): (column: FieldCol<T>) => FieldCol<T>;
export function withWhen<T>(
  pred: (row: T) => boolean,
  column?: FieldCol<T>,
): FieldCol<T> | ((column: FieldCol<T>) => FieldCol<T>) {
  if (column === undefined) return (c) => withWhen(pred, c);
  const cell = cellOf(column);
  return {
    ...column,
    accessor: (row) => (pred(row) ? cell(row) : ""),
  };
}

export function withHint<T>(hint: string, column: FieldCol<T>): FieldCol<T>;
export function withHint<T>(
  hint: string,
): (column: FieldCol<T>) => FieldCol<T>;
export function withHint<T>(
  hint: string,
  column?: FieldCol<T>,
): FieldCol<T> | ((column: FieldCol<T>) => FieldCol<T>) {
  if (column === undefined) return (c) => withHint(hint, c);
  return {
    ...column,
    header: (
      <Tooltip content={hint}>
        <span class="sui-field-th-hint">{column.header}</span>
      </Tooltip>
    ),
  };
}
