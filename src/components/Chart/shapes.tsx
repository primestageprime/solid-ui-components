// ============================================
// Chart shapes — closed Shape enum + Descriptor type + ShapeGlyph renderer.
// Per spec D4: anchor = geometric center, size = nominal pixel dimension
// (max of width/height). Custom paths are drawn inside `viewBox` and
// uniformly scaled to `size`. Default size = 12px (per-slot override).
// ============================================
import { Component, Show } from "solid-js";

export type Shape =
  | "circle"
  | "chevron"
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
// Path data is anchored at geometric center per spec D4.
const CHEVRON_PATH = "M-6,3 L0,-4 L6,3";
const PIN_PATH =
  "M0,-7 C-4,-7 -4,-3 0,2 C4,-3 4,-7 0,-7 Z M-1.5,-5 a1.5,1.5 0 1,0 3,0 a1.5,1.5 0 1,0 -3,0";
const BUILTIN_VIEWBOX: [number, number] = [16, 16];

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
          fillRule="none"
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
      <Show when={typeof props.descriptor.shape === "object"}>
        {(() => {
          const custom = props.descriptor.shape as { path: string; viewBox?: [number, number] };
          return (
            <PathScaled
              path={custom.path}
              viewBox={custom.viewBox ?? BUILTIN_VIEWBOX}
              size={size()}
              color={props.descriptor.color}
              stroke={stroke()}
              strokeWidth={strokeWidth()}
            />
          );
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
