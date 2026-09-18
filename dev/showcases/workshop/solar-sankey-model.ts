/**
 * Solar Sankey — the geometry, as plain functions. No Solid, no DOM.
 *
 * Peter, 2026-09-18: "show a proportionate sankey for the solar in my house.
 * Use the percentage of the production for each output", from a card sketch —
 * the sun and its 4.4 kW on the left, three ribbons fanning right to
 * exporting, charging and consuming, each ribbon as thick as its share. And:
 * "Keep the color scheme from the original illustration" — the Enphase Live
 * Status screen, whose flows are all the PRODUCING cyan and whose three
 * destinations each carry their own colour.
 *
 * PROPORTIONATE means one scale for every width: the source bar is the whole
 * production, each ribbon's thickness is its share of that bar, and the three
 * destination bars together are exactly the source bar again, split by gaps.
 * So a ribbon is the same thickness at both ends and nothing is created or
 * lost between them — the picture's only claim, and the test's.
 */

/** The Live Status screen's palette. */
export const SOLAR_COLORS = {
  /** Producing, and every flow line on the original. */
  producing: "#1ca3d6",
  /** Exporting to the grid — the transmission tower's grey. */
  exporting: "#6b7075",
  /** Charging the battery. */
  charging: "#7cc242",
  /** Consuming in the house. */
  consuming: "#f07a1e",
} as const;

export type SolarIcon = "sun" | "tower" | "battery" | "house";

/** Where the production goes. */
export interface SolarOutput {
  readonly id: "exporting" | "charging" | "consuming";
  /** The verb the original uses under the figure. */
  readonly label: string;
  readonly kw: number;
  readonly color: string;
  readonly icon: SolarIcon;
}

/** The screenshot's reading, in the SKETCH's order: top to bottom. */
export const PRODUCING_KW = 4.4;
export const OUTPUTS: readonly SolarOutput[] = [
  { id: "exporting", label: "Exporting", kw: 1.6, color: SOLAR_COLORS.exporting, icon: "tower" },
  { id: "charging", label: "Charging", kw: 2.3, color: SOLAR_COLORS.charging, icon: "battery" },
  { id: "consuming", label: "Consuming", kw: 0.5, color: SOLAR_COLORS.consuming, icon: "house" },
];

/** An output's share of production, 0–1. */
export const shareOf = (kw: number, producing: number): number =>
  producing <= 0 ? 0 : kw / producing;

/** A share as the percentage a person reads: whole numbers, `36%`. */
export const percentOf = (kw: number, producing: number): string =>
  `${Math.round(shareOf(kw, producing) * 100)}%`;

/** A power figure the way the original writes it: one decimal, `1.6 kW`. */
export const formatKw = (kw: number): string => `${kw.toFixed(1)} kW`;

/** The frame the diagram is drawn into. */
export interface SankeyFrame {
  readonly width: number;
  readonly height: number;
  /** x of the source bar's right edge, where every ribbon leaves. */
  readonly sourceX: number;
  /** x of the destination bars' left edge, where every ribbon arrives. */
  readonly sinkX: number;
  /** The height the WHOLE production is drawn at. */
  readonly band: number;
  /** Space between two destination bars. */
  readonly gap: number;
}

export const FRAME: SankeyFrame = {
  width: 820,
  height: 360,
  sourceX: 190,
  sinkX: 560,
  band: 220,
  gap: 34,
};

/** One ribbon: where it leaves, where it lands, and its outline. */
export interface Ribbon {
  readonly output: SolarOutput;
  readonly thickness: number;
  readonly sourceTop: number;
  readonly sinkTop: number;
  readonly path: string;
}

/**
 * The ribbons, top to bottom. Each leaves the source bar in the slice its
 * share owns and lands on its own destination bar at the same thickness,
 * crossing with a horizontal-tangent cubic — flat out of the source and flat
 * into the sink, the curve the sketch draws.
 */
export const ribbonsOf = (
  outputs: readonly SolarOutput[],
  producing: number,
  frame: SankeyFrame = FRAME,
): Ribbon[] => {
  const sinkSpan = frame.band + frame.gap * Math.max(0, outputs.length - 1);
  let sourceTop = (frame.height - frame.band) / 2;
  let sinkTop = (frame.height - sinkSpan) / 2;
  const mid = (frame.sourceX + frame.sinkX) / 2;
  return outputs.map((output) => {
    const thickness = shareOf(output.kw, producing) * frame.band;
    const a = sourceTop;
    const b = sinkTop;
    const path = [
      `M ${frame.sourceX} ${a}`,
      `C ${mid} ${a} ${mid} ${b} ${frame.sinkX} ${b}`,
      `L ${frame.sinkX} ${b + thickness}`,
      `C ${mid} ${b + thickness} ${mid} ${a + thickness} ${frame.sourceX} ${a + thickness}`,
      "Z",
    ].join(" ");
    const ribbon = { output, thickness, sourceTop: a, sinkTop: b, path };
    sourceTop += thickness;
    sinkTop += thickness + frame.gap;
    return ribbon;
  });
};
