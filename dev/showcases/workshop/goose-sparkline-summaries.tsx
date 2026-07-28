// Bench: Goose Sparkline Summaries (workshop:goose-sparkline-summaries)
//
// SKELETON — a page to argue over, not a design.
//
// The centrepiece is a PROTOTYPE distribution sparkline (defined locally at the
// bottom of this file, deliberately NOT in src/ until the encoding is settled).
// It tries to say five things at once about a series:
//
//   min / max       solid outlined translucent box, the full range
//   typical         dashed box inside it, the percentile pair
//   average         hairline across the whole width, at the mean
//   outliers        hollow rings on the points outside the typical band
//   direction       colour AND shading — green/red/grey for end-vs-start, with
//                   the fill densest at the end the series finished on
//
// Twelve shapes are plotted on ONE shared domain, because that is the only way
// the min/max box means anything: on a per-series auto-scale every box would
// fill its rect and the encoding would collapse.
import { type Component, For } from "solid-js";
import {
  MutedBody,
  NoteText,
  SectionTitle,
  SubsectionTitle,
  TextLabel,
  TextSublabel,
  TextValue,
} from "../../../src/components/Text";
import { CompactSurface } from "../../../src/components/Surface";
import {
  CardGrid,
  ClusterRow,
  ContentStack,
  TightStack,
  WrappedClusterRow,
} from "../../../src/components/Layout";
import {
  BlockPlaceholder,
  MediumPlaceholder,
} from "../../../src/components/Placeholder";
import {
  TrendSparkline,
  trendOf,
  type SparklineTrend,
} from "../../../src/components/TrendSparkline";
import { Sparkline } from "../../../src/components/Sparkline";
import { HeartbeatSparkline } from "../../../src/components/HeartbeatSparkline";
import { join, length, map, mean, sortBy } from "../../../src/fn";
import "./goose-sparkline-summaries.css";

// ── Stub series ──────────────────────────────────────────────────────────────
// Everything lives in 0..100 so one shared domain is honest. Deterministic:
// no Math.random, so the page looks the same every reload and we can talk
// about a specific squiggle.

const TICKS = 40;

const rng = (seed: number): (() => number) => {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
};

const clamp = (v: number): number => Math.max(0, Math.min(100, v));

/** Sample a shape function across the tick range. `t` is 0..1. */
const shape = (
  seed: number,
  f: (t: number, i: number, r: () => number) => number,
): number[] => {
  const r = rng(seed);
  return Array.from({ length: TICKS }, (_, i) =>
    clamp(f(i / (TICKS - 1), i, r)),
  );
};

/** A drifting random walk — the shape a real throughput metric actually has. */
const walk = (seed: number, start: number, drift: number): number[] => {
  const r = rng(seed);
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < TICKS; i++) {
    v = clamp(v + (r() - 0.5) * 18 + drift);
    out.push(v);
  }
  return out;
};

interface Example {
  label: string;
  /** What this shape is here to test — the reason it earns a cell. */
  note: string;
  values: number[];
}

const EXAMPLES: Example[] = [
  {
    label: "Flat",
    note: "identical every tick — the degenerate case; range box collapses to a line",
    values: shape(1, () => 50),
  },
  {
    label: "Flat, noisy",
    note: "no trend, real jitter — should still read as 'nothing happening'",
    values: shape(2, (_t, _i, r) => 50 + (r() - 0.5) * 14),
  },
  {
    label: "Trending up",
    note: "the clean rise; typical band should sit wide and centred",
    values: shape(3, (t, _i, r) => 18 + t * 62 + (r() - 0.5) * 6),
  },
  {
    label: "Trending down",
    note: "the clean fall — same geometry, opposite colour and shading",
    values: shape(4, (t, _i, r) => 88 - t * 60 + (r() - 0.5) * 6),
  },
  {
    label: "Periodic",
    note: "two full cycles; mean and typical band say more than the endpoints do",
    values: shape(5, (t) => 50 + Math.sin(t * Math.PI * 4) * 26),
  },
  {
    label: "Periodic, damping",
    note: "settling oscillation — range wide, typical band narrow",
    values: shape(6, (t) => 50 + Math.sin(t * Math.PI * 5) * 34 * (1 - t * 0.8)),
  },
  {
    label: "Random walk",
    note: "ends near where it started; direction encoding is nearly arbitrary here",
    values: walk(7, 52, 0),
  },
  {
    label: "Step change",
    note: "a regime shift — bimodal, so the mean sits where no sample ever was",
    values: shape(8, (t, _i, r) => (t < 0.45 ? 32 : 72) + (r() - 0.5) * 5),
  },
  {
    label: "Spiky",
    note: "quiet baseline with three excursions — the outlier case",
    values: shape(9, (_t, i, r) =>
      i === 9 || i === 22 || i === 31 ? 88 + r() * 8 : 34 + (r() - 0.5) * 8,
    ),
  },
  {
    label: "Sawtooth",
    note: "batch drain and refill — every tick is 'typical', none is a trend",
    values: shape(10, (t) => 18 + (((t * 5) % 1) * 60)),
  },
  {
    label: "Dip and recover",
    note: "U-shaped; endpoints alone would call this flat",
    values: shape(11, (t, _i, r) => 70 - Math.sin(t * Math.PI) * 45 + t * 8 + (r() - 0.5) * 4),
  },
  {
    label: "Late ramp",
    note: "nothing, then everything — the shape a backfill makes",
    values: shape(12, (t, _i, r) => 22 + Math.pow(t, 3.2) * 66 + (r() - 0.5) * 4),
  },
];

/** One shared domain for every example — see the header note. */
const DOMAIN: [number, number] = [0, 100];

/** The percentile pair the dashed box spans. Open question: p10/p90 here,
 *  p25/p75 in the comparison row below, and p95 was floated too. */
const TYPICAL: [number, number] = [0.1, 0.9];
const TIGHT: [number, number] = [0.25, 0.75];

// ── The prototype ────────────────────────────────────────────────────────────

const W = 200;
const H = 56;
const INSET = 2;

const ascending = (values: number[]): number[] => sortBy((v: number) => v, values);

/** Linear-interpolated percentile, 0..1. */
const percentile = (p: number, values: number[]): number => {
  const s = ascending(values);
  const at = (length(s) - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo] + (s[hi] - s[lo]) * (at - lo);
};

interface Summary {
  min: number;
  max: number;
  avg: number;
  bandLo: number;
  bandHi: number;
  trend: SparklineTrend;
  outliers: number;
}

const summarize = (values: number[], band: [number, number]): Summary => {
  const bandLo = percentile(band[0], values);
  const bandHi = percentile(band[1], values);
  const outside = (v: number): boolean => v < bandLo || v > bandHi;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: mean(values),
    bandLo,
    bandHi,
    trend: trendOf(values[0], values[length(values) - 1]),
    outliers: length(values.filter(outside)),
  };
};

interface DistributionSparklineProps {
  values: number[];
  /** Shared across a group — a per-series auto-scale makes the range box mean
   *  nothing, because it would always fill the rect. */
  domain: [number, number];
  band?: [number, number];
}

const DistributionSparkline: Component<DistributionSparklineProps> = (props) => {
  const band = (): [number, number] => props.band ?? TYPICAL;
  const stats = (): Summary => summarize(props.values, band());

  const yOf = (v: number): number => {
    const span = props.domain[1] - props.domain[0] || 1;
    return INSET + (1 - (v - props.domain[0]) / span) * (H - INSET * 2);
  };
  const boxOf = (lo: number, hi: number): { y: number; height: number } => ({
    y: yOf(hi),
    height: Math.max(1, yOf(lo) - yOf(hi)),
  });

  const points = (): string => {
    const n = length(props.values);
    const at = (v: number, i: number): string =>
      `${((i / (n - 1)) * W).toFixed(1)},${yOf(v).toFixed(1)}`;
    return join(" ", map(at, props.values));
  };

  const outlying = (): Array<{ cx: number; cy: number }> => {
    const n = length(props.values);
    const s = stats();
    const marked = map(
      (v: number, i: number) => ({ v, cx: (i / (n - 1)) * W, cy: yOf(v) }),
      props.values,
    );
    return marked.filter((p) => p.v < s.bandLo || p.v > s.bandHi);
  };

  return (
    <svg
      class={`gs-dist__svg gs-dist--${stats().trend}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect
        class="gs-dist__range"
        x={0.5}
        width={W - 1}
        y={boxOf(stats().min, stats().max).y}
        height={boxOf(stats().min, stats().max).height}
        fill={`url(#gs-grad-${stats().trend})`}
      />
      <rect
        class="gs-dist__typical"
        x={4.5}
        width={W - 9}
        y={boxOf(stats().bandLo, stats().bandHi).y}
        height={boxOf(stats().bandLo, stats().bandHi).height}
      />
      <line
        class="gs-dist__mean"
        x1={0}
        x2={W}
        y1={yOf(stats().avg)}
        y2={yOf(stats().avg)}
      />
      <polyline class="gs-dist__line" points={points()} />
      <For each={outlying()}>
        {(p) => <circle class="gs-dist__outlier" cx={p.cx} cy={p.cy} r={2.5} />}
      </For>
    </svg>
  );
};

/** The three gradients, defined once per page and referenced by id. */
const SparkGradientDefs: Component = () => (
  <svg class="gs-defs" aria-hidden="true">
    <defs>
      {/* Strong at the TOP: the series ended above where it began. */}
      <linearGradient id="gs-grad-up" class="gs-grad gs-grad--up" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" />
        <stop offset="100%" />
      </linearGradient>
      {/* Strong at the BOTTOM: it ended below. */}
      <linearGradient id="gs-grad-down" class="gs-grad gs-grad--down" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" />
        <stop offset="100%" />
      </linearGradient>
      {/* Even: it ended where it began. */}
      <linearGradient id="gs-grad-flat" class="gs-grad gs-grad--flat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" />
        <stop offset="100%" />
      </linearGradient>
    </defs>
  </svg>
);

const round = (v: number): string => v.toFixed(0);

const statLine = (values: number[], band: [number, number]): string => {
  const s = summarize(values, band);
  return `min ${round(s.min)} · typical ${round(s.bandLo)}–${round(s.bandHi)} · mean ${round(s.avg)} · max ${round(s.max)} · ${s.outliers} outside`;
};

const bandName = (band: [number, number]): string =>
  `p${band[0] * 100}–p${band[1] * 100}`;

const ExampleCell: Component<{ example: Example; band?: [number, number] }> = (
  props,
) => (
  <CompactSurface>
    <TightStack>
      <TextLabel>
        {props.band
          ? `${props.example.label} · ${bandName(props.band)}`
          : props.example.label}
      </TextLabel>
      <DistributionSparkline
        values={props.example.values}
        domain={DOMAIN}
        band={props.band}
      />
      <TextSublabel>{statLine(props.example.values, props.band ?? TYPICAL)}</TextSublabel>
      <MutedBody>{props.example.note}</MutedBody>
    </TightStack>
  </CompactSurface>
);

// ── The old summary row, kept for the "what is one cell" question ────────────

interface SummaryStub {
  label: string;
  value: string;
  series: number[];
}

const SUMMARIES: SummaryStub[] = [
  {
    label: "Acumatica",
    value: "1.42M rows",
    series: [
      210, 260, 240, 305, 380, 350, 420, 470, 455, 520, 610, 580, 640, 705,
    ],
  },
  {
    label: "NetSuite",
    value: "884k rows",
    series: [
      480, 455, 470, 430, 410, 395, 360, 375, 320, 300, 315, 280, 265, 240,
    ],
  },
  {
    label: "Global Shop",
    value: "617k rows",
    series: [
      120, 135, 128, 140, 132, 145, 138, 150, 142, 155, 148, 160, 152, 165,
    ],
  },
];

/** Batches completed per poll tick — spiky, so `sawtooth` reads better. */
const BATCH_TICKS = [4, 0, 7, 1, 9, 2, 6, 0, 11, 3, 8, 1, 5, 12, 2, 7];

/** Worker heartbeat: fraction of the claim timeout consumed at each tick. */
const HEARTBEAT = [
  0.1, 0.3, 0.5, 0.2, 0.4, 0.6, 0.15, 0.35, 0.55, 0.25, 0.45, 0.2,
];

const BAND_COMPARISON = [EXAMPLES[4], EXAMPLES[7], EXAMPLES[8]];

const OPEN_QUESTIONS = [
  "Is five encodings in one 200×56 rect too many? The honest alternative is dropping the mean hairline — it is the one a reader can reconstruct.",
  "Which percentile pair is 'typical'? p10/p90 above, p25/p75 in the comparison row. p95 alone would be a one-sided 'how bad does it get' mark instead of a band.",
  "'Step change' shows the failure mode of any central measure: the mean sits at 52, where no sample ever was. Do we want a bimodality hint, or is that out of scope for a sparkline?",
  "Outliers are currently 'outside the typical band', which by construction is ~20% of EVERY series — look at 'Trending up': its 'outliers' are just its first and last few points, which is nonsense. A fixed rule (>1.5 IQR, or beyond a threshold we actually care about) would mark nothing on a clean ramp and plenty on 'Spiky', which is the behaviour we want.",
  "Direction is first-vs-last. 'Random walk' and 'Dip and recover' show why that is fragile — would first-third-mean vs last-third-mean be better?",
  "For rows-remaining, DOWN is good. Invert the colour per metric, or make the caller pass the trend in (TrendSparkline already lets them)?",
  "Shared domain is assumed here. When sources differ by 10×, a small one flattens to a line inside its box — accept that, or normalise each series and lose comparability?",
  "What is one summary cell in the real row — label + value + spark, plus a delta, a target, a status tone?",
  "Does this row react to the goose filter bar (see workshop:goose-filter-bar), or is it always global?",
];

export const meta = { label: "Goose Sparkline Summaries" };

const GooseSparklineSummariesBench: Component = () => (
  <div class="component-section component-section--full">
    <SparkGradientDefs />
    <SectionTitle>Goose Sparkline Summaries</SectionTitle>
    <MutedBody>
      Bare page — a skeleton, not a design. The distribution sparkline below is
      a local prototype, not a SUI component yet; it stays in this file until
      the encoding is settled.
    </MutedBody>

    <ContentStack>
      <SubsectionTitle>How to read it</SubsectionTitle>
      <CompactSurface>
        <TightStack>
          <ClusterRow>
            <div class="gs-legend-swatch">
              <DistributionSparkline values={EXAMPLES[2].values} domain={DOMAIN} />
            </div>
            <TightStack>
              <TextSublabel>
                Solid translucent box — the full min..max range.
              </TextSublabel>
              <TextSublabel>
                Dashed box inside it — the typical band (p{TYPICAL[0] * 100}–p
                {TYPICAL[1] * 100}).
              </TextSublabel>
              <TextSublabel>Hairline across the width — the mean.</TextSublabel>
              <TextSublabel>
                Hollow rings — the points outside the typical band.
              </TextSublabel>
              <TextSublabel>
                Colour AND shading — green rising, red falling, grey neither;
                the fill is densest at the end it finished on.
              </TextSublabel>
            </TightStack>
          </ClusterRow>
        </TightStack>
      </CompactSurface>

      <SubsectionTitle>
        Region 1 — twelve shapes, one shared domain
      </SubsectionTitle>
      <MutedBody>
        Every cell is scaled to {DOMAIN[0]}..{DOMAIN[1]}, so the boxes are
        comparable across cells. That is the whole reason the range box carries
        information: on a per-series auto-scale it would fill the rect every
        time.
      </MutedBody>
      <CardGrid>
        <For each={EXAMPLES}>{(e) => <ExampleCell example={e} />}</For>
      </CardGrid>

      <SubsectionTitle>Region 2 — which band is "typical"?</SubsectionTitle>
      <MutedBody>
        The same three series twice: p{TYPICAL[0] * 100}–p{TYPICAL[1] * 100} on
        the left of each pair, p{TIGHT[0] * 100}–p{TIGHT[1] * 100} on the right.
        The tighter band reads as "where it usually sits" and marks far more
        outliers; the wider one reads as "the working range" and marks almost
        none.
      </MutedBody>
      <CardGrid>
        <For each={BAND_COMPARISON}>
          {(e) => (
            <>
              <ExampleCell example={e} band={TYPICAL} />
              <ExampleCell example={e} band={TIGHT} />
            </>
          )}
        </For>
      </CardGrid>

      <SubsectionTitle>Region 3 — the summary row (TrendSparkline)</SubsectionTitle>
      <MutedBody>
        What SUI ships today, unchanged: a value with a trend-coloured line and
        no distribution at all. Kept so the two can be compared directly.
      </MutedBody>
      <CardGrid>
        <For each={SUMMARIES}>
          {(s) => (
            <CompactSurface>
              <TightStack>
                <TextLabel>{s.label}</TextLabel>
                <TextValue>{s.value}</TextValue>
                <TrendSparkline
                  values={s.series}
                  trend={trendOf(s.series[0], s.series[length(s.series) - 1])}
                />
                <TextSublabel>rows/hr, last 14 ticks</TextSublabel>
              </TightStack>
            </CompactSurface>
          )}
        </For>
        <MediumPlaceholder label="4th cell? totals? unbuilt" />
      </CardGrid>

      <SubsectionTitle>Region 4 — other sparkline shapes, unplaced</SubsectionTitle>
      <CompactSurface>
        <TightStack>
          <TextSublabel>
            These two exist but we have not decided whether they belong in the
            summary row, the header, or a detail pane.
          </TextSublabel>
          <WrappedClusterRow>
            <ClusterRow>
              <TextLabel>Batches / tick</TextLabel>
              <Sparkline values={BATCH_TICKS} mode="sawtooth" />
            </ClusterRow>
            <ClusterRow>
              <TextLabel>Worker heartbeat</TextLabel>
              <HeartbeatSparkline state="connected" samples={HEARTBEAT} pulse />
            </ClusterRow>
          </WrappedClusterRow>
        </TightStack>
      </CompactSurface>

      <SubsectionTitle>Region 5 — whatever sits under the row</SubsectionTitle>
      <BlockPlaceholder label="drill-down / per-object table goes here" />

      <SubsectionTitle>Open questions</SubsectionTitle>
      <TightStack>
        <For each={OPEN_QUESTIONS}>{(q) => <NoteText>{q}</NoteText>}</For>
      </TightStack>
    </ContentStack>
  </div>
);

export default GooseSparklineSummariesBench;
