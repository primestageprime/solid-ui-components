// ============================================
// GlyphBadge — Primitive (Depth 1). SVG mark; composes no library components.
// Owns SvgMarks.css (glyph face and stroke).
//
// A filled disc centred in the box it is handed, carrying ONE glyph: a short
// TEXT (`!`, `3`) or a stroked PATH drawn in a 16×16 viewBox (a padlock, a
// tick). The disc's diameter is the box's shorter side, so the caller sizes a
// badge by the box it gives it. Both paints are data.
//
// Why not `ShapeGlyph`: that draws a descriptor's SHAPE; this draws a shape
// WITH a sign in it. A disc is one `<circle>`, and composing ShapeGlyph for it
// would buy nothing but a depth.
// ============================================
import { type Component, Show } from "solid-js";
import { type SvgBox, centerOf } from "./geometry";
import "./SvgMarks.css";

export type BadgeGlyph = { readonly text: string } | { readonly path: string };

export interface GlyphBadgeProps {
  readonly box: SvgBox;
  /** Disc paint. */
  readonly color: string;
  readonly glyph: BadgeGlyph;
  /** Glyph paint. */
  readonly glyphColor: string;
  /** Optional ring round the disc, in the page's ground, so the badge lifts off what it overlaps. */
  readonly ringColor?: string;
}

export const GlyphBadge: Component<GlyphBadgeProps> = (props) => {
  const c = () => centerOf(props.box);
  const r = () => Math.min(props.box.width, props.box.height) / 2;
  const scale = () => (r() * 1.2) / 16;
  return (
    <g class="sui-glyph-badge">
      <circle
        cx={c().x}
        cy={c().y}
        r={r()}
        fill={props.color}
        stroke={props.ringColor ?? "none"}
        stroke-width={props.ringColor ? 1 : 0}
      />
      <Show
        when={"text" in props.glyph}
        fallback={
          <path
            class="sui-glyph-badge__path"
            d={(props.glyph as { path: string }).path}
            stroke={props.glyphColor}
            transform={`translate(${c().x - 8 * scale()}, ${c().y - 8 * scale()}) scale(${scale()})`}
          />
        }
      >
        <text
          class="sui-glyph-badge__text"
          x={c().x}
          y={c().y}
          fill={props.glyphColor}
          font-size={String(r() * 1.3)}
        >
          {(props.glyph as { text: string }).text}
        </text>
      </Show>
    </g>
  );
};
