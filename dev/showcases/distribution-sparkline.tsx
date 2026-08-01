// DistributionSparkline — the sparkline that shows a series' SPREAD, not just
// its direction, demonstrated in the three containers it actually lives in.
//
// The component has no size. It fills whatever box it is given, in both axes,
// so the gallery's job here is to supply differently-shaped boxes and let the
// same component take each one: a dashboard tile, a table cell, a definition
// list row. Everything is drawn against ONE domain derived from the whole set,
// because a per-series scale would make every range box fill its rect.
import { type Component, For } from "solid-js";
import {
  P95Sparkline,
  p95DomainOf,
} from "../../src/components/DistributionSparkline";
import { TrendSparkline, trendOf } from "../../src/components/TrendSparkline";
import { StripedTable } from "../../src/components/Table";
import type { TableColumn } from "../../src/components/Table/types";
import {
  CardGrid,
  ClusterRow,
  ContentStack,
  LabelValueGrid,
  NarrowStack,
  TightStack,
  WrappedClusterRow,
} from "../../src/components/Layout";
import { CompactSurface } from "../../src/components/Surface";
import {
  MutedBody,
  SubsectionTitle,
  TextLabel,
  TextSublabel,
  TextValue,
} from "../../src/components/Text";
import { map, prop } from "../../src/fn";
import "./distribution-sparkline.css";

// ── One set of series ────────────────────────────────────────────────────────
// Rows migrated per tick, per source. Deterministic, so the page is the same
// every reload and a specific squiggle can be talked about.

const TICKS = 40;

const rng = (seed: number): (() => number) => {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
};

const series = (
  seed: number,
  f: (t: number, i: number, r: () => number) => number,
): number[] => {
  const r = rng(seed);
  return Array.from({ length: TICKS }, (_, i) =>
    Math.max(0, f(i / (TICKS - 1), i, r)),
  );
};

interface Source {
  name: string;
  total: string;
  /** Why this source is in the demo — the shape it contributes. */
  shape: string;
  values: number[];
}

const SOURCES: Source[] = [
  {
    name: "Acumatica",
    total: "1.42M rows",
    shape: "steady climb",
    values: series(1, (t, _i, r) => 210 + t * 480 + (r() - 0.5) * 60),
  },
  {
    name: "NetSuite",
    total: "884k rows",
    shape: "winding down",
    values: series(2, (t, _i, r) => 520 - t * 260 + (r() - 0.5) * 50),
  },
  {
    name: "Global Shop",
    total: "617k rows",
    shape: "flat and quiet",
    values: series(3, (_t, _i, r) => 300 + (r() - 0.5) * 40),
  },
  {
    name: "Sage",
    total: "402k rows",
    shape: "bursty — three retry storms",
    values: series(4, (_t, i, r) =>
      i === 8 || i === 21 || i === 33 ? 780 + r() * 90 : 240 + (r() - 0.5) * 40,
    ),
  },
  {
    name: "Epicor",
    total: "1.05M rows",
    shape: "a regime shift when the second worker landed",
    values: series(5, (t, _i, r) => (t < 0.45 ? 210 : 560) + (r() - 0.5) * 45),
  },
  {
    name: "Dynamics",
    total: "738k rows",
    shape: "nothing, then a backfill",
    values: series(6, (t, _i, r) => 120 + Math.pow(t, 3) * 540 + (r() - 0.5) * 30),
  },
];

// ONE domain for the whole set. This is the caller's modelling decision — SUI
// does not know whether "the set" is every source, the filtered ones, or one
// source over time, so it takes the answer rather than guessing it.
const AXIS = p95DomainOf(map(prop("values"), SOURCES));

const columns: TableColumn<Source>[] = [
  { id: "name", header: "Source", align: "left", width: "10rem", accessor: (r) => r.name },
  { id: "total", header: "Migrated", align: "right", width: "8rem", accessor: (r) => r.total },
  {
    id: "throughput",
    header: "Rows / tick",
    align: "left",
    accessor: (r) => (
      <div class="dist-spark-cell">
        <P95Sparkline values={r.values} yDomain={AXIS} />
      </div>
    ),
    sortValue: (r) => Math.max(...r.values),
  },
  { id: "shape", header: "Reads as", align: "left", accessor: (r) => r.shape },
];

const LADDER: Array<[string, string]> = [
  ["240px — everything reads", "dist-spark-w240"],
  ["120px — still all four marks", "dist-spark-w120"],
  ["90px — percentile rules drop out", "dist-spark-w90"],
  ["50px — box and line only", "dist-spark-w50"],
];

const HEIGHTS: Array<[string, string]> = [
  ["20px — a table row", "dist-spark-h20"],
  ["48px — a definition list", "dist-spark-h48"],
  ["120px — a dashboard tile", "dist-spark-h120"],
];

export const DistributionSparklineShowcase: Component = () => (
  <div class="component-section component-section--full">
    <h2>DistributionSparkline — Atomic (Depth 1)</h2>
    <p class="text-meta">
      Owns CSS (DistributionSparkline.css). A sparkline that shows a series'
      SPREAD as well as its direction: a solid box for min..max with the
      direction shading, dashed rules for the percentile band, a hairline at the
      mean, and the series itself clipped to the plot. Curried variant:{" "}
      <code>P95Sparkline</code>. Factory:{" "}
      <code>createDistributionSparkline()</code>. Helpers:{" "}
      <code>p95DomainOf</code>, <code>extentDomainOf</code>.
    </p>

    <ContentStack>
      <SubsectionTitle>The shared domain is the caller's job</SubsectionTitle>
      <MutedBody>
        <code>yDomain</code> is required, and it is DATA rather than visual
        config. Auto-scaled, every range box would fill its rect and the picture
        would say nothing — the encoding only means something when a whole set
        shares one scale. What counts as "the set" is a modelling decision the
        client owns, so the component takes the answer instead of guessing it.
        Every sparkline on this page is drawn against{" "}
        <code>p95DomainOf(map(prop("values"), SOURCES))</code> ={" "}
        {AXIS[0].toFixed(0)}..{AXIS[1].toFixed(0)}.
      </MutedBody>
    </ContentStack>

    <ContentStack>
      <SubsectionTitle>In a dashboard tile</SubsectionTitle>
      <TextSublabel>
        The tile gives it a height; it takes the column's width. Compare Sage
        and Global Shop: near-identical typical bands, wildly different ranges —
        which is the whole reason to draw more than a line.
      </TextSublabel>
      <CardGrid>
        <For each={SOURCES}>
          {(s) => (
            <CompactSurface>
              <TightStack>
                <TextLabel>{s.name}</TextLabel>
                <TextValue>{s.total}</TextValue>
                <div class="dist-spark-tile">
                  <P95Sparkline values={s.values} yDomain={AXIS} />
                </div>
                <TextSublabel>{s.shape}</TextSublabel>
              </TightStack>
            </CompactSurface>
          )}
        </For>
      </CardGrid>
    </ContentStack>

    <ContentStack>
      <SubsectionTitle>In a table column</SubsectionTitle>
      <TextSublabel>
        A cell renders it like any other value. Because every row shares the
        domain, the column can be read down as a comparison rather than as six
        unrelated pictures.
      </TextSublabel>
      <StripedTable data={SOURCES} columns={columns} />
    </ContentStack>

    <ContentStack>
      <SubsectionTitle>In a definition list</SubsectionTitle>
      <TextSublabel>
        At one text line tall the percentile rules have already dropped out, and
        what survives is a range and a shape beside the label — about as much as
        a line of prose can carry.
      </TextSublabel>
      <LabelValueGrid>
        <For each={SOURCES}>
          {(s) => (
            <>
              <TextSublabel>{s.name}</TextSublabel>
              <div class="dist-spark-dl-value">
                <P95Sparkline values={s.values} yDomain={AXIS} />
              </div>
            </>
          )}
        </For>
      </LabelValueGrid>
    </ContentStack>

    <ContentStack>
      <SubsectionTitle>Responsive — width</SubsectionTitle>
      <TextSublabel>
        The same series in four widths. There is no size prop: the SVG stretches
        to its box and strokes are non-scaling, so a wide short cell does not
        produce fat horizontals. Under 100px the percentile rules hide
        themselves and under 60px the mean follows — four horizontal marks in
        that space is mud, and the box plus the line are the two that still
        read.
      </TextSublabel>
      <WrappedClusterRow>
        <For each={LADDER}>
          {([label, cls]) => (
            <TightStack>
              <div class={cls}>
                <P95Sparkline values={SOURCES[3].values} yDomain={AXIS} />
              </div>
              <TextSublabel>{label}</TextSublabel>
            </TightStack>
          )}
        </For>
      </WrappedClusterRow>
    </ContentStack>

    <ContentStack>
      <SubsectionTitle>Responsive — height</SubsectionTitle>
      <TextSublabel>
        The same series in three heights. It absorbs the row rather than
        imposing an aspect ratio, which is what lets one component serve a
        28px table row and a 120px dashboard tile.
      </TextSublabel>
      <NarrowStack>
        <For each={HEIGHTS}>
          {([label, cls]) => (
            <ClusterRow>
              <div class={cls}>
                <P95Sparkline values={SOURCES[4].values} yDomain={AXIS} />
              </div>
              <TextSublabel>{label}</TextSublabel>
            </ClusterRow>
          )}
        </For>
      </NarrowStack>
    </ContentStack>

    <ContentStack>
      <SubsectionTitle>Against TrendSparkline</SubsectionTitle>
      <TextSublabel>
        The same six series in the smaller component. It answers "which way is
        this going" and nothing else — the right choice when that is the whole
        question, and it auto-scales per series unless you hand it a domain.
      </TextSublabel>
      <CardGrid>
        <For each={SOURCES}>
          {(s) => (
            <CompactSurface>
              <TightStack>
                <TextLabel>{s.name}</TextLabel>
                <TrendSparkline
                  values={s.values}
                  trend={trendOf(s.values[0], s.values[s.values.length - 1])}
                  yDomain={AXIS}
                />
              </TightStack>
            </CompactSurface>
          )}
        </For>
      </CardGrid>
    </ContentStack>
  </div>
);
