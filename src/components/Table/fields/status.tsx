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
import { centered, humanize, toneWrap } from "./shared";
import {
  createStatusBadge,
  type StatusBadgeVariant,
  type StatusBadgeDataProps,
} from "../../Badge/StatusBadge";

export const geo: FieldGeo = { minCh: 9, maxCh: 9, padPx: 18, css: "calc(9ch + 18px)" };

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
): FieldCol<T> => ({
  id: String(key),
  header: centered(opts.header ?? humanize(String(key))),
  align: "right",
  width: geo.css,
  geo,
  accessor: (row) => {
    const value = row[key];
    if (value == null || value === "") return "";
    const mapping = map[String(value)];
    if (!mapping) return toneWrap("muted", String(value));
    const Badge = BADGES[TONE_VARIANT[mapping.tone]];
    return <Badge label={mapping.label} />;
  },
});
