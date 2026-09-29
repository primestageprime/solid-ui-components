// ============================================
// Span adornments — Composite (Depth 2). Factories that bind the SvgMarks to
// `SpanLanes`' adornment contract (`SpanDisplayProps`).
//
// THE PLUGGABLE-DISPLAY PATTERN. A slot owns WHERE a display goes (the box);
// the display owns WHAT it looks like; the consumer CONFIGURES it with
// accessors over its own datum. Each factory here takes those accessors once
// and returns an ordinary component, so the consumer's call site is data only:
//
//   const Labels = createSpanEndLabels<Job>({
//     lead: (j) => `#${j.id}`,
//     trail: (j) => k(j.total),
//     color: (j) => ink[j.status],
//   });
//   <SpanLanes data={jobs} paint={…} adornments={[Labels]} />
//
// Anything with the `SpanDisplayProps` shape plugs in the same way; these are
// the stock ones, not the only ones.
// ============================================
import { type Component, Show } from "solid-js";
import { BoxRing } from "../SvgMarks/BoxRing";
import { EndLabels } from "../SvgMarks/EndLabels";
import { type BadgeGlyph, GlyphBadge } from "../SvgMarks/GlyphBadge";
import type { SpanDisplayProps } from "./SpanLanes";
import type { SpanDatum } from "./spanLanes";

/** `#3 … $33.8k`: a lead and a trail label on the bar, the trail dropped when it does not fit. */
export function createSpanEndLabels<T extends SpanDatum>(config: {
  readonly lead?: (datum: T) => string | null;
  readonly trail?: (datum: T) => string | null;
  readonly color: (datum: T) => string;
}): Component<SpanDisplayProps<T>> {
  return (props) => (
    <EndLabels
      box={props.box}
      lead={config.lead?.(props.datum) ?? null}
      trail={config.trail?.(props.datum) ?? null}
      color={config.color(props.datum)}
    />
  );
}

export type SpanCorner = "top-left" | "top-right";

/** A glyph badge on a corner of the bar, drawn only when `when(datum)` holds — the `!` or the padlock. */
export function createSpanBadge<T extends SpanDatum>(config: {
  readonly when: (datum: T) => boolean;
  readonly glyph: (datum: T) => BadgeGlyph;
  readonly color: (datum: T) => string;
  readonly glyphColor: (datum: T) => string;
  readonly corner: SpanCorner;
  /** Badge diameter in px. Default 16. */
  readonly size?: number;
  /** A ring in the page ground so the badge lifts off the bar. */
  readonly ringColor?: string;
}): Component<SpanDisplayProps<T>> {
  const size = config.size ?? 16;
  return (props) => (
    <Show when={config.when(props.datum)}>
      <GlyphBadge
        box={{
          x:
            config.corner === "top-left"
              ? props.box.x - size / 2 + 1
              : props.box.x + props.box.width - size / 2 + 2,
          y: props.box.y - size / 2,
          width: size,
          height: size,
        }}
        color={config.color(props.datum)}
        glyph={config.glyph(props.datum)}
        glyphColor={config.glyphColor(props.datum)}
        ringColor={config.ringColor}
      />
    </Show>
  );
}

/** An attention ring round the bar, drawn only when `when(datum)` holds. */
export function createSpanRing<T extends SpanDatum>(config: {
  readonly when: (datum: T) => boolean;
  readonly color: (datum: T) => string;
}): Component<SpanDisplayProps<T>> {
  return (props) => (
    <Show when={config.when(props.datum)}>
      <BoxRing box={props.box} color={config.color(props.datum)} />
    </Show>
  );
}
