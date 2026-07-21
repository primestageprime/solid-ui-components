// Table field — status (Depth 1: composes StatusBadge).
// Geometry: a fixed status cell — light/dot/badge plus a short label
// ("● 118/140", "OPERATOR").
//
// statusCol (ruled 2026-07-18): the curried badge cell. Configured with a
// mapping of VALID values → { label, tone }; the tone resolves to the theme's
// badge variant inside SUI. Null/empty renders blank (ruled 2026-07-18: no
// empty markers); an unmapped value renders as quiet muted text so bad data
// stays visible without wearing a badge it didn't earn.
import type { Component } from "solid-js";
import type { Tone } from "../../../types";
import type { FieldCol, FieldGeo } from "./shared";
import { centered, floorGeoAtLabel, humanize, toneWrap } from "./shared";
import {
  createStatusBadge,
  type StatusBadgeVariant,
  type StatusBadgeDataProps,
} from "../../Badge/StatusBadge";

export const geo: FieldGeo = { minCh: 9, maxCh: 9, padPx: 18, css: "calc(9ch + 18px)" };

/** The sm badge's own chrome beyond the label glyphs: 6px padding ×2 + 1px
 *  border ×2 + letter-spacing (≈0.4px/ch, budgeted for badge-short labels).
 *  Measured 2026-07-21: a 9ch "VIOLATION" badge is 82.3px — 15.2px of chrome
 *  the flat 9ch geometry never budgeted, so the badge clipped in its cell. */
const BADGE_CHROME_PX = 18;

/** Tone → theme badge variant. The client names a meaning, never a color. */
const TONE_VARIANT: Record<Tone, StatusBadgeVariant> = {
  default: "pending",
  success: "compliant",
  warning: "warning",
  danger: "violation",
  accent: "info",
  muted: "pending",
};

const BADGES: Record<StatusBadgeVariant, Component<StatusBadgeDataProps>> = {
  compliant: createStatusBadge({ variant: "compliant", size: "sm" }),
  violation: createStatusBadge({ variant: "violation", size: "sm" }),
  warning: createStatusBadge({ variant: "warning", size: "sm" }),
  pending: createStatusBadge({ variant: "pending", size: "sm" }),
  info: createStatusBadge({ variant: "info", size: "sm" }),
};

export interface StatusColMapping {
  /** Display string for the badge. */
  label: string;
  /** Semantic treatment; maps to the theme's badge variant. */
  tone: Tone;
}

export interface StatusColOpts {
  /** Header label (default: humanized key). */
  header?: string;
}

/** A badge column keyed on `key`, configured with the valid value mapping.
 *  Values right-align per the status ruling; header centered. */
export const statusCol = <T,>(
  key: keyof T,
  map: Record<string, StatusColMapping>,
  opts: StatusColOpts = {},
): FieldCol<T> => {
  const label = opts.header ?? humanize(String(key));
  // Geometry derives from the mapping (the badge set is known at configure
  // time, same rule as enumCol): content-fit fixed at the longest label, with
  // the badge chrome budgeted on top of the cell chrome — the static 9ch geo
  // remains only as the col() fallback for custom status-typed cells.
  const longest = Object.values(map).reduce(
    (m, s) => Math.max(m, s.label.length),
    0,
  );
  const padPx = (geo.padPx ?? 0) + BADGE_CHROME_PX;
  const badgeGeo: FieldGeo = {
    minCh: longest,
    maxCh: longest,
    padPx,
    css: `calc(${longest}ch + ${padPx}px)`,
  };
  const colGeo = floorGeoAtLabel(badgeGeo, label);
  return {
  id: String(key),
  header: centered(label),
  align: "right",
  width: colGeo.css,
  geo: colGeo,
  // Sorts by display label so equal badges group together; unmapped values
  // fall back to their raw text, blanks sort last.
  sortValue: (row) => {
    const value = row[key];
    if (value == null || value === "") return null;
    return map[String(value)]?.label ?? String(value);
  },
  accessor: (row) => {
    const value = row[key];
    if (value == null || value === "") return "";
    const mapping = map[String(value)];
    if (!mapping) return toneWrap("muted", String(value));
    const Badge = BADGES[TONE_VARIANT[mapping.tone]];
    return <Badge label={mapping.label} />;
  },
  };
};
