/**
 * Solar Sankey bench — Peter's card sketch of 2026-09-18, drawn.
 *
 * The house's solar production on the left, split into three ribbons that fan
 * right to where it goes: exported to the grid, charging the battery, consumed
 * in the house. PROPORTIONATE — every ribbon is as thick as its share of
 * production, and each destination reads that share as a percentage. The
 * figures are the Enphase Live Status reading the sketch was made from, in that
 * screen's colours: cyan for producing and for every flow, and each
 * destination in its own colour (grid grey, battery green, house orange).
 *
 * The geometry is `solar-sankey-model.ts`, pure and tested. This file is the
 * drawing: raw SVG, because SUI has no flow-Sankey mark yet — that is what this
 * bench is prototyping. The icons are drawn here for the same reason: SUI's
 * `Icon` has no sun, tower, battery or house.
 */
import { type Component, For } from "solid-js";
import { SectionTitle, NoteText } from "../../../src/components/Text";
import {
  FRAME,
  OUTPUTS,
  PRODUCING_KW,
  SOLAR_COLORS,
  type SolarIcon,
  formatKw,
  percentOf,
  ribbonsOf,
} from "./solar-sankey-model";

export const meta = { label: "Solar Sankey" };

/** Width of the source and destination bars. */
const BAR = 10;
/** Radius of the ring each icon sits in, as on the original. */
const RING = 24;

/** One glyph, centred on (0, 0), stroked in `color`. */
const Glyph: Component<{ icon: SolarIcon; color: string }> = (props) => {
  const stroke = {
    stroke: props.color,
    "stroke-width": 2,
    fill: "none",
    "stroke-linecap": "round" as const,
    "stroke-linejoin": "round" as const,
  };
  switch (props.icon) {
    case "sun":
      return (
        <g {...stroke}>
          <circle r={7} />
          <For each={[0, 45, 90, 135, 180, 225, 270, 315]}>
            {(angle) => (
              <line x1={11} x2={15} transform={`rotate(${angle})`} />
            )}
          </For>
        </g>
      );
    case "tower":
      return (
        <g {...stroke}>
          <path d="M -8 13 L -2 -13 L 2 -13 L 8 13" />
          <path d="M -12 -7 L 12 -7 M -9 1 L 9 1" />
          <path d="M -5 1 L 6 13 M 5 1 L -6 13" />
        </g>
      );
    case "battery":
      return (
        <g {...stroke}>
          <rect x={-11} y={-6} width={20} height={12} rx={2} />
          <path d="M 11 -3 L 11 3" />
        </g>
      );
    case "house":
      return (
        <g {...stroke}>
          <path d="M -11 -1 L 0 -11 L 11 -1" />
          <path d="M -8 -3 L -8 10 L 8 10 L 8 -3" />
          <path d="M -3 10 L -3 3 L 3 3 L 3 10" />
        </g>
      );
  }
};

const SolarSankeyBench: Component = () => {
  const ribbons = ribbonsOf(OUTPUTS, PRODUCING_KW);
  const sourceTop = (FRAME.height - FRAME.band) / 2;
  const mid = FRAME.height / 2;

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Solar Sankey</SectionTitle>
      <NoteText>
        Live status: every ribbon is as thick as its share of production.
      </NoteText>
      <div class="solar-sankey-demo">
        <svg
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          role="img"
          aria-label={`Producing ${formatKw(PRODUCING_KW)}: ${OUTPUTS.map(
            (o) => `${o.label.toLowerCase()} ${formatKw(o.kw)}, ${percentOf(o.kw, PRODUCING_KW)}`,
          ).join("; ")}`}
        >
          {/* THE SOURCE: the sun in its ring, its figure, and the bar every
              ribbon leaves from — the whole production at full height. */}
          <g transform={`translate(${RING + 12} ${mid})`}>
            <circle r={RING} fill="none" stroke={SOLAR_COLORS.producing} stroke-width={2} />
            <Glyph icon="sun" color={SOLAR_COLORS.producing} />
          </g>
          <text
            x={RING * 2 + 26}
            y={mid - 4}
            fill={SOLAR_COLORS.producing}
            class="solar-sankey-demo__figure"
          >
            {formatKw(PRODUCING_KW)}
          </text>
          <text x={RING * 2 + 26} y={mid + 18} class="solar-sankey-demo__label">
            Producing
          </text>
          <rect
            x={FRAME.sourceX - BAR}
            y={sourceTop}
            width={BAR}
            height={FRAME.band}
            fill={SOLAR_COLORS.producing}
          />

          {/* THE FLOWS: cyan, as every flow line on the original is. */}
          <For each={ribbons}>
            {(ribbon) => (
              <path
                d={ribbon.path}
                fill={SOLAR_COLORS.producing}
                fill-opacity={0.38}
                stroke={SOLAR_COLORS.producing}
                stroke-opacity={0.8}
                stroke-width={1}
              />
            )}
          </For>

          {/* THE DESTINATIONS: a bar in each one's own colour, its icon in a
              ring, its figure and its share of production. */}
          <For each={ribbons}>
            {(ribbon) => {
              const centre = ribbon.sinkTop + ribbon.thickness / 2;
              const iconX = FRAME.sinkX + BAR + 14 + RING;
              const textX = iconX + RING + 14;
              return (
                <g>
                  <rect
                    x={FRAME.sinkX}
                    y={ribbon.sinkTop}
                    width={BAR}
                    height={Math.max(ribbon.thickness, 1)}
                    fill={ribbon.output.color}
                  />
                  <g transform={`translate(${iconX} ${centre})`}>
                    <circle r={RING} fill="none" stroke={ribbon.output.color} stroke-width={2} />
                    <Glyph icon={ribbon.output.icon} color={ribbon.output.color} />
                  </g>
                  <text
                    x={textX}
                    y={centre - 4}
                    fill={ribbon.output.color}
                    class="solar-sankey-demo__figure"
                  >
                    {formatKw(ribbon.output.kw)}
                  </text>
                  <text x={textX} y={centre + 18} class="solar-sankey-demo__label">
                    {ribbon.output.label} · {percentOf(ribbon.output.kw, PRODUCING_KW)}
                  </text>
                </g>
              );
            }}
          </For>
        </svg>
      </div>
    </div>
  );
};

export default SolarSankeyBench;
