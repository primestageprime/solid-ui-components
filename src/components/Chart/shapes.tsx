// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Glyph convention: anchor = geometric center, size = max(width, height).
// Custom paths sit inside `viewBox` and are uniformly scaled to `size`.
import { Component, Show } from "solid-js";

export type Shape =
  | "circle"
  | "chevron"
  | "chevron-down"
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
const BUILTIN_VIEWBOX: [number, number] = [16, 16];

/** Narrows a Shape to its custom-path variant, or undefined for built-in tags. */
const asCustomShape = (
  shape: Shape,
): { path: string; viewBox?: [number, number] } | undefined =>
  typeof shape === "object" ? shape : undefined;

/** True when `s` is one of the four supported Shape variants. */
const isKnownShape = (s: unknown): boolean =>
  s === "circle" ||
  s === "chevron" ||
  s === "chevron-down" ||
  s === "pin" ||
  (typeof s === "object" && s !== null && typeof (s as { path?: unknown }).path === "string");

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
          fill={props.descriptor.color}
          stroke={stroke()}
          stroke-width={strokeWidth()}
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
}> = (props) => {
  const scale = () => props.size / Math.max(props.viewBox[0], props.viewBox[1]);
  return (
    <path
      d={props.path}
      transform={`scale(${scale()})`}
      fill={props.fillRule === "none" ? "none" : props.color}
      fill-rule={props.fillRule === "evenodd" ? "evenodd" : undefined}
      stroke={props.fillRule === "none" ? props.color : props.stroke}
      stroke-width={props.fillRule === "none" ? Math.max(2, props.strokeWidth) : props.strokeWidth}
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  );
};
