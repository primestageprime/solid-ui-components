// Table field — enum (Depth 1: a small fixed-set string column).
// A CONTENT-FIT FIXED column for a string whose full value SET is known at
// configure time and short (ruled 2026-07-20: "a smaller ENUM field for strings
// where the full set is 20 chars or less"). Because the set is known, geometry
// is derived from it — min === max === the longest member — so a three-value
// enum ("Before"/"During"/"After") sizes to 6ch instead of textCol's flexible
// 8–40ch. Floored at the header label (floorGeoAtLabel), chrome padPx 16 like
// text. LEFT-aligned plain text: it's a word, not a number (intCol, right) and
// not a badge (statusCol, which renders chips from a mapping).
//
// Null/empty renders BLANK (ruled 2026-07-18: no empty markers). A value NOT in
// the set renders as quiet muted text (toneWrap "muted") — the same spirit as
// statusCol's unmapped case: bad data stays visible without wearing membership
// it didn't earn. sortValue is the raw string. If any member exceeds 20
// characters the factory THROWS at configure time, pointing the caller to
// textCol — enumCol refuses to be a long-text column.
import {
  floorGeoAtLabel,
  humanize,
  toneWrap,
  type FieldCol,
  type FieldGeo,
  type ToneFn,
} from "./shared";

/** Longest an enum member may be; a longer set belongs in textCol. */
const MAX_MEMBER_CH = 20;

/** Cell chrome (both sides summed, px) added on top of the content ch —
 *  matches text/int under the field-frame's 8px/side padding. */
const PAD_PX = 16;

export interface EnumColOpts<T> {
  /** Configure-time treatment: (value, row) → Tone (ruled 2026-07-17). */
  tone?: ToneFn<T, string>;
  /** Header label (default: humanized key). */
  header?: string;
}

/** A small fixed-set string column keyed on `key`. Geometry derives from
 *  `values` (content-fit fixed at the longest member), floored at the header
 *  label; left-aligned plain text. Throws if any member exceeds 20 characters. */
export const enumCol = <T,>(
  key: keyof T,
  values: readonly string[],
  opts: EnumColOpts<T> = {},
): FieldCol<T> => {
  const tooLong = values.find((v) => v.length > MAX_MEMBER_CH);
  if (tooLong !== undefined)
    throw new Error(
      `enumCol("${String(key)}"): member ${JSON.stringify(tooLong)} exceeds ` +
        `${MAX_MEMBER_CH}ch — use textCol for variable-length text.`,
    );
  const label = opts.header ?? humanize(String(key));
  const longest = values.reduce((m, v) => Math.max(m, v.length), 0);
  const baseGeo: FieldGeo = {
    minCh: longest,
    maxCh: longest,
    padPx: PAD_PX,
    css: `calc(${longest}ch + ${PAD_PX}px)`,
  };
  const colGeo = floorGeoAtLabel(baseGeo, label);
  const known = new Set(values);
  return {
    id: String(key),
    header: label,
    width: colGeo.css,
    geo: colGeo,
    sortValue: (row) => String(row[key] ?? ""),
    accessor: (row) => {
      const value = row[key];
      if (value == null || value === "") return "";
      const str = String(value);
      // Off-set value stays visible as quiet muted text (statusCol spirit).
      if (!known.has(str)) return toneWrap("muted", str);
      return toneWrap(opts.tone?.(str, row), str);
    },
  };
};
