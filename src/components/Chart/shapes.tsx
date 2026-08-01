// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Glyph convention: anchor = geometric center, size = max(width, height).
// Custom paths sit inside `viewBox` and are uniformly scaled to `size`.
import { type Component, Show } from "solid-js";

export type Shape =
  | "circle"
  | "chevron"
  | "chevron-down"
  | "diamond"
  | "square"
  | "pentagon"
  | "pin"
  | { path: string; viewBox?: [number, number] };

export interface Descriptor {
  color: string;
  shape: Shape;
  /** Nominal px dimension (max of width/height). Defaults to 12 if a slot does not override. */
  size?: number;
}

export const DEFAULT_GLYPH_SIZE = 12;

// Built-in path strings, centered on (0,0) within a 16x16 viewBox.
// Filled triangle pointing up (▲): base at bottom (+y), apex at top (-y).
const CHEVRON_PATH = "M-6,4 L6,4 L0,-6 Z";
// Filled triangle pointing down (▼): base at top (-y), apex at bottom (+y).
const CHEVRON_DOWN_PATH = "M-6,-4 L6,-4 L0,6 Z";
const PIN_PATH =
  "M0,-7 C-4,-7 -4,-3 0,2 C4,-3 4,-7 0,-7 Z M-1.5,-5 a1.5,1.5 0 1,0 3,0 a1.5,1.5 0 1,0 -3,0";
// Filled diamond (◆): vertices at top/right/bottom/left.
const DIAMOND_PATH = "M0,-7 L7,0 L0,7 L-7,0 Z";
// Filled square (■), centered.
const SQUARE_PATH = "M-6,-6 L6,-6 L6,6 L-6,6 Z";
// Filled regular pentagon (⬠), apex up; vertices on a radius-7 circle.
const PENTAGON_PATH =
  "M0,-7 L6.657,-2.163 L4.114,5.663 L-4.114,5.663 L-6.657,-2.163 Z";
const BUILTIN_VIEWBOX: [number, number] = [16, 16];

/** Narrows a Shape to its custom-path variant, or undefined for built-in tags. */
const asCustomShape = (
  shape: Shape,
): { path: string; viewBox?: [number, number] } | undefined =>
  typeof shape === "object" ? shape : undefined;

/** True when `s` is one of the supported Shape variants. */
const isKnownShape = (s: unknown): boolean =>
  s === "circle" ||
  s === "chevron" ||
  s === "chevron-down" ||
  s === "diamond" ||
  s === "square" ||
  s === "pentagon" ||
  s === "pin" ||
  (typeof s === "object" &&
    s !== null &&
    typeof (s as { path?: unknown }).path === "string");

// Module-level dedupe set for unknown-shape warnings. Keeps warn-once invariant
// across all ShapeGlyph instances without coupling to component lifecycle.
const warnedShapes = new Set<string>();
const warnUnknownShape = (s: unknown): void => {
  const key = typeof s === "string" ? s : JSON.stringify(s);
  if (warnedShapes.has(key)) return;
  warnedShapes.add(key);
  // eslint-disable-next-line no-console
  console.warn(`ShapeGlyph: unknown shape ${key} — rendering nothing`);
};

interface ShapeGlyphProps {
  descriptor: Descriptor;
  cx: number;
  cy: number;
  /** Override descriptor.size at the slot call site. */
  size?: number;
  /** Optional CSS class for theming hooks (e.g. selected state). */
  class?: string;
  /** Optional stroke; defaults to none. */
  stroke?: string;
  strokeWidth?: number;
  /** Outline-only: no fill, the shape's colour becomes its stroke. Works for
   *  every shape (including `circle`). Used for the "unselected" glyph state. */
  hollow?: boolean;
}

/**
 * ShapeGlyph — pure descriptor → SVG element. Anchors via a translate so the
 * descriptor's path coordinates stay center-origin. Custom paths receive the
 * same uniform scale as built-ins (size / max(viewBox)).
 */
export const ShapeGlyph: Component<ShapeGlyphProps> = (props) => {
  const size = () => props.size ?? props.descriptor.size ?? DEFAULT_GLYPH_SIZE;
  const stroke = () => props.stroke ?? "none";
  const strokeWidth = () => props.strokeWidth ?? 0;

  return (
    <g transform={`translate(${props.cx}, ${props.cy})`} class={props.class}>
      <Show when={props.descriptor.shape === "circle"}>
        <circle
          r={size() / 2}
          fill={props.hollow ? "none" : props.descriptor.color}
          stroke={props.hollow ? props.descriptor.color : stroke()}
          stroke-width={
            props.hollow ? Math.max(1.5, strokeWidth()) : strokeWidth()
          }
        />
      </Show>
      <Show when={props.descriptor.shape === "chevron"}>
        <PathScaled
          path={CHEVRON_PATH}
          viewBox={BUILTIN_VIEWBOX}
          size={size()}
          color={props.descriptor.color}
          stroke={stroke()}
          strokeWidth={strokeWidth()}
          hollow={props.hollow}
        />
      </Show>
      <Show when={props.descriptor.shape === "chevron-down"}>
        <PathScaled
          path={CHEVRON_DOWN_PATH}
          viewBox={BUILTIN_VIEWBOX}
          size={size()}
          color={props.descriptor.color}
          stroke={stroke()}
          strokeWidth={strokeWidth()}
          hollow={props.hollow}
        />
      </Show>
      <Show when={props.descriptor.shape === "diamond"}>
        <PathScaled
          path={DIAMOND_PATH}
          viewBox={BUILTIN_VIEWBOX}
          size={size()}
          color={props.descriptor.color}
          stroke={stroke()}
          strokeWidth={strokeWidth()}
          hollow={props.hollow}
        />
      </Show>
      <Show when={props.descriptor.shape === "square"}>
        <PathScaled
          path={SQUARE_PATH}
          viewBox={BUILTIN_VIEWBOX}
          size={size()}
          color={props.descriptor.color}
          stroke={stroke()}
          strokeWidth={strokeWidth()}
          hollow={props.hollow}
        />
      </Show>
      <Show when={props.descriptor.shape === "pentagon"}>
        <PathScaled
          path={PENTAGON_PATH}
          viewBox={BUILTIN_VIEWBOX}
          size={size()}
          color={props.descriptor.color}
          stroke={stroke()}
          strokeWidth={strokeWidth()}
          hollow={props.hollow}
        />
      </Show>
      <Show when={props.descriptor.shape === "pin"}>
        <PathScaled
          path={PIN_PATH}
          viewBox={BUILTIN_VIEWBOX}
          size={size()}
          color={props.descriptor.color}
          stroke={stroke()}
          strokeWidth={strokeWidth()}
          fillRule="evenodd"
          hollow={props.hollow}
        />
      </Show>
      <Show when={asCustomShape(props.descriptor.shape)}>
        {(custom) => (
          <PathScaled
            path={custom().path}
            viewBox={custom().viewBox ?? BUILTIN_VIEWBOX}
            size={size()}
            color={props.descriptor.color}
            stroke={stroke()}
            strokeWidth={strokeWidth()}
            hollow={props.hollow}
          />
        )}
      </Show>
      <Show when={!isKnownShape(props.descriptor.shape)}>
        {(() => {
          warnUnknownShape(props.descriptor.shape);
          return null;
        })()}
      </Show>
    </g>
  );
};

const PathScaled: Component<{
  path: string;
  viewBox: [number, number];
  size: number;
  color: string;
  stroke: string;
  strokeWidth: number;
  fillRule?: "none" | "evenodd" | "nonzero";
  hollow?: boolean;
}> = (props) => {
  const scale = () => props.size / Math.max(props.viewBox[0], props.viewBox[1]);
  // Outline-only when `hollow` is set, or via the legacy fillRule="none" signal.
  const strokeOnly = () => props.hollow === true || props.fillRule === "none";
  return (
    <path
      d={props.path}
      transform={`scale(${scale()})`}
      fill={strokeOnly() ? "none" : props.color}
      fill-rule={props.fillRule === "evenodd" ? "evenodd" : undefined}
      stroke={strokeOnly() ? props.color : props.stroke}
      stroke-width={strokeOnly() ? Math.max(2, props.strokeWidth) : props.strokeWidth}
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  );
};
