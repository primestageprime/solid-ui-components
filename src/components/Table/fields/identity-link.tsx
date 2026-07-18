// Table field — identityLink (Depth 1: composes LongTextCell).
// The IdentityLink cell (ruled 2026-07-18): an entity that has a detail page
// displays its name AS the link to that page by default. The href derivation
// is configure-time — the cell never understands the entity's routing; an
// optional glyph fn renders a leading type icon. Name geometry (expanding,
// ellipsis + tooltip); renders a plain anchor — SPA routers (@solidjs/router)
// intercept same-origin anchor clicks, so no router import is needed here.
import type { JSX } from "solid-js";
import { LongTextCell } from "../textCells";
import { geo as nameGeo } from "./name";
import { humanize, type FieldCol } from "./shared";

export interface IdentityLinkColOpts<T> {
  /** Configure-time routing: the entity's detail-page href for this row. */
  href: (row: T) => string;
  /** Optional leading glyph (e.g. an entity-type icon). */
  glyph?: (row: T) => JSX.Element;
  /** Header label (default: humanized key). */
  header?: string;
}

/** The primary identity column for an entity with a detail page: the name is
 *  the link. Left-aligned flowing text at name geometry, sortable by name. */
export const identityLinkCol = <T,>(
  key: keyof T,
  opts: IdentityLinkColOpts<T>,
): FieldCol<T> => ({
  id: String(key),
  header: opts.header ?? humanize(String(key)),
  width: nameGeo.css,
  ellipsis: true,
  sortValue: (row) => String(row[key] ?? ""),
  geo: nameGeo,
  accessor: (row) => {
    const value = String(row[key] ?? "");
    // Blank, not a dead link (ruled 2026-07-18: no empty markers).
    if (value === "") return "";
    return (
      <a class="sui-identity-link" href={opts.href(row)}>
        {opts.glyph?.(row)}
        <LongTextCell value={value} clampLines={1} reveal="tooltip" />
      </a>
    );
  },
});
