// Table field — list (Depth 1: composes Tooltip).
// A comma-separated list cell with a count-based overflow indicator (ruled
// 2026-07-18): up to `max` items render inline, the remainder collapses to a
// muted "+N more", and the full list lives in a hover tooltip. Empty renders
// blank (no empty markers). Flowing-text geometry (shares the text field's).
import { EllipsisText } from "../EllipsisText";
import { join, map } from "../../../fn";
import { geo as textGeo } from "./text";
import { humanize, toneWrap, type FieldCol } from "./shared";

export interface ListColOpts<I> {
  /** Items shown inline before the overflow indicator (default 3). */
  max?: number;
  /** Header label (default: humanized key). */
  header?: string;
  /** Item display string (default String(item)) — for object lists, e.g.
   *  (v) => `${v.vessel_name} (${v.asset_id})`. */
  item?: (item: I) => string;
}

/** A list column keyed on `key` (row[key]: I[]; strings by default). */
export const listCol = <T, I = string>(
  key: keyof T,
  opts: ListColOpts<I> = {},
): FieldCol<T> => ({
  id: String(key),
  header: opts.header ?? humanize(String(key)),
  ellipsis: true,
  geo: textGeo,
  accessor: (row) => {
    const raw = (row[key] as unknown as readonly I[] | null) ?? [];
    if (raw.length === 0) return "";
    const items = map(opts.item ?? String, raw);
    const max = opts.max ?? 3;
    const shown = join(", ", items.slice(0, max));
    const extra = items.length - max;
    const full = join(", ", items);
    // Tooltip iff the full list is hidden: either the inline text is clipped by
    // the cell (measured by EllipsisText) or items collapsed into "+N more".
    return (
      <EllipsisText class="sui-value-string" tooltip={full} alsoWhen={() => extra > 0}>
        {shown}
        {extra > 0 ? toneWrap("muted", ` +${extra} more`) : null}
      </EllipsisText>
    );
  },
});
