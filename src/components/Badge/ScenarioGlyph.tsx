// ============================================
// ScenarioGlyph — Atomic (Depth 1)
// The accent-coloured, filled-or-hollow, SHAPED sibling of ScenarioDot. Where
// ScenarioDot is always a circle, ScenarioGlyph renders any ShapeGlyph shape
// (triangle, diamond, square, pentagon, circle, …) so a scenario is
// recognisable by its SHAPE as well as its accent colour — the same glyph on
// its chip, its calibrate column header, and its config-membership icons.
//   • filled  → a solid glyph (the SELECTED scenario / the drawn line)
//   • hollow  → an outline only (an unselected scenario)
// Both share the same box, so selecting never shifts layout. Wraps the SVG-only
// ShapeGlyph primitive in an inline <svg> so it drops into a text row exactly
// like ScenarioDot. A sibling of ScenarioDot / BaselineDot.
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import { ShapeGlyph, type Shape } from "../Chart/shapes";

export interface ScenarioGlyphProps
  extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** The scenario's accent colour (any CSS colour). */
  color: string;
  /** The scenario's identity shape (parallel to its accent colour). */
  shape: Shape;
  /** Solid glyph when true (the selected scenario); outline when false or
   *  omitted (an unselected scenario). */
  filled?: boolean;
  /** Outer box size in px (default 10). */
  size?: number;
}

export const ScenarioGlyph: Component<ScenarioGlyphProps> = (props) => {
  const [local, others] = splitProps(props, [
    "color",
    "shape",
    "filled",
    "size",
    "class",
    "style",
  ]);
  const size = () => local.size ?? 10;
  const overrides = () =>
    local.style && typeof local.style === "object" ? local.style : {};
  return (
    <span
      class={`scenario-glyph${local.class ? ` ${local.class}` : ""}`}
      style={{
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        "vertical-align": "middle",
        // Never shrinks in a flex row (matches ScenarioDot).
        flex: "0 0 auto",
        ...overrides(),
      }}
      {...others}
    >
      {/* overflow:visible so a hollow stroke that straddles the box edge (e.g. a
          full-diameter circle) is never clipped. */}
      <svg
        width={size()}
        height={size()}
        viewBox={`0 0 ${size()} ${size()}`}
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        <ShapeGlyph
          descriptor={{ color: local.color, shape: local.shape, size: size() }}
          cx={size() / 2}
          cy={size() / 2}
          hollow={local.filled !== true}
        />
      </svg>
    </span>
  );
};
