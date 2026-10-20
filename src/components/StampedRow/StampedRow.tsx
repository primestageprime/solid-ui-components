// ============================================
// StampedRow — Composite (Depth 2)
// Tags: shows:text, shows:date, shows:avatar, does:view, data:scalar, role:row
// Owns zero CSS files and zero inline style={} (STYLE_GUIDE Layout Purity —
// composes curried Primitives only).
// One timestamped line: a 16px glyph, a label that takes the width and
// ellipsizes, and a mono time at the right. The glyph is chosen by `kind`
// (done / active / note / started / completed) unless an `icon` is stated.
//   <StampedRow kind="done" label="Wrote the spec" t="2026-10-15T14:05:00Z" />
// `density` is the one presentational knob and it is locked in a curried
// variant: `StampedRow` is a 22px list line, `PinnedStampedRow` a 40px bar.
// The two pure cores, `stampGlyph` and `formatStampTime`, print as tables
// without a DOM (StampedRow.test.tsx).
// ============================================
import { type Component, mergeProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Icon, type IconName, type IconVariant } from "../Icon";
import { BarLineRow, CompactLineRow, NoShrinkClusterRow } from "../Layout";
import { EllipsizedTitle, MonoMeta } from "../Text";

export type StampKind = "done" | "active" | "note" | "started" | "completed";
export type StampDensity = "list" | "pinned";

export interface StampedRowProps {
  /** What the line says. Ellipsizes when it does not fit. */
  label: string;
  /** When it happened. A Date, or anything `new Date()` reads (an ISO string). */
  t: Date | string;
  /** Picks the glyph. Default "note". */
  kind?: StampKind;
  /** A glyph of your own, in place of the one `kind` picks. */
  icon?: IconName;
  /** 22px list line or 40px pinned bar. Locked by the curried variants. */
  density?: StampDensity;
  /** IANA zone the time prints in (e.g. "UTC"). Default: the host's zone. */
  timeZone?: string;
}

/** The glyph each kind draws. `completed` is `done` made solid: the filled check. */
export const STAMP_GLYPHS: Record<StampKind, { name: IconName; variant: IconVariant }> = {
  done: { name: "check", variant: "outline" },
  completed: { name: "check", variant: "solid" },
  active: { name: "clock", variant: "outline" },
  started: { name: "arrow-right", variant: "outline" },
  note: { name: "edit", variant: "outline" },
};

/** The glyph a row draws: a stated `icon` wins, else the kind's, else the note's. */
export function stampGlyph(
  kind?: StampKind,
  icon?: IconName,
): { name: IconName; variant: IconVariant } {
  if (icon) return { name: icon, variant: "outline" };
  return STAMP_GLYPHS[kind ?? "note"];
}

/**
 * The time a row shows: 24-hour `HH:mm` in `timeZone` (an IANA name; the host's
 * zone when omitted). An unreadable `t` shows as an empty string, never "Invalid Date".
 */
export function formatStampTime(t: Date | string, timeZone?: string): string {
  const date = typeof t === "string" ? new Date(t) : t;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(timeZone && { timeZone }),
  }).format(date);
}

export const StampedRow: Component<StampedRowProps> = (props) => {
  const glyph = () => stampGlyph(props.kind, props.icon);
  const Line = () => (props.density === "pinned" ? BarLineRow : CompactLineRow);
  return (
    <Dynamic component={Line()}>
      <Icon name={glyph().name} variant={glyph().variant} size="md" />
      <EllipsizedTitle title={props.label}>{props.label}</EllipsizedTitle>
      <NoShrinkClusterRow>
        <MonoMeta>{formatStampTime(props.t, props.timeZone)}</MonoMeta>
      </NoShrinkClusterRow>
    </Dynamic>
  );
};

/** Presentational knobs — locked at variant-definition time. */
export type StampedRowOverrides = Pick<StampedRowProps, "density">;

/** Props that remain for consumers of a curried StampedRow variant. */
export type StampedRowDataProps = Omit<StampedRowProps, keyof StampedRowOverrides>;

export function createStampedRow(
  defaults: Partial<StampedRowProps>,
): Component<StampedRowDataProps> {
  return (props) => <StampedRow {...(mergeProps(defaults, props) as StampedRowProps)} />;
}
