/**
 * Builder Board bench — the four-panel frame at three viewport sizes.
 *
 * This bench builds NOTHING but the frame. Panels B, C and D hold a title and
 * a centred placeholder, so what is on show is the GEOMETRY: A over B in the
 * top half, C beside the fixed-width rail D in the bottom half, at a laptop, a
 * desktop and a wide viewport — and the same picture at each, with only the
 * pane C growing.
 *
 * PANEL A HOLDS A REAL FILL CHART, not a placeholder (2026-09-22). The first
 * consumer wrapped its `chartHeight="fill"` chart in a content-sized shell of
 * its own and the chart measured 1472×0 in every tab: `fill` is `height:
 * 100%`, which resolves against the nearest box with a height and computes to
 * `auto` against one without. A placeholder cannot fail that way, so it could
 * not have caught it. The chart here sits in the card's `GrowFillBox` the way
 * the License Board bench has it, and the measured table's A row is the
 * chart's own svg height as well as the card's — a zero there is the defect.
 *
 * Two tables sit under the frame. The MODEL is `builderBoardTable`, the
 * headless observation `geometry.ts` prints for the picked viewport; the
 * MEASURED table is `getBoundingClientRect` on the four rendered panels,
 * relative to the frame. They should agree to the pixel; if they ever do not,
 * either the model or the frame has changed and the other has not followed.
 *
 * The three sizes are bench CSS classes in dev/main.css (a bench may state a
 * viewport; a component may not), wrapped in a `ScrollXBox` because two of
 * them are wider than the gallery.
 */
import { type Component, createSignal, onCleanup, onMount } from "solid-js";
import { join, map } from "../../../src/fn";
import { BuilderBoard } from "../../../src/components/BuilderBoard";
import { StillCashflowScrubChart } from "../../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../../src/components/CashflowScrubChart";
import {
  observeBuilderBoard,
  type PanelId,
  type Viewport,
} from "../../../src/components/BuilderBoard/geometry";
import { CodeBlock } from "../../../src/components/CodeBlock";
import { calloutModeFor } from "../../../src/components/RateGauge";
import {
  GrowCenterColumn,
  GrowFillBox,
  NarrowStack,
  ScrollXBox,
  SpreadRow,
} from "../../../src/components/Layout";
import { GhostButton } from "../../../src/components/Button";
import { createSegmentedControl } from "../../../src/components/SegmentedControl";
import { NoteText, SectionTitle, TextTitle } from "../../../src/components/Text";

export const meta = { label: "Builder Board" };

type SizeId = "phone" | "tablet" | "laptop" | "desktop" | "wide";

/** The viewports, as the bench classes in dev/main.css state them. The phone
 *  sits under BUILDER_BOARD_SINGLE_COLUMN_BELOW, so it draws one column. */
const SIZES: Readonly<Record<SizeId, Viewport>> = {
  phone: { width: 390, height: 760 },
  tablet: { width: 768, height: 900 },
  laptop: { width: 1000, height: 600 },
  desktop: { width: 1280, height: 720 },
  wide: { width: 1600, height: 900 },
};

const SizePicker = createSegmentedControl({
  options: map(
    (id: SizeId) => ({
      value: id,
      label: `${id} ${SIZES[id].width}×${SIZES[id].height}`,
    }),
    ["phone", "tablet", "laptop", "desktop", "wide"] as const,
  ),
});

const PANELS: readonly PanelId[] = ["a", "b", "c", "d"];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ninety days of a balance that climbs `stepCents` a day — enough of a line
 *  to see the chart take the card's height. Two fixtures, a decade apart in
 *  scale, so a swap between them moves the y-axis by an order of magnitude:
 *  the STILL chart in panel A shows the new axis on the same frame, with no
 *  glide, which is the point of the swap button. */
const cellsClimbing = (stepCents: number): CashflowCell[] =>
  map((i: number) => {
    const start = new Date(Date.UTC(2026, 0, 1) + i * DAY_MS);
    return {
      start,
      end: new Date(start.getTime() + DAY_MS),
      cashflowCents: stepCents,
      balanceCents: 1_000_000 + i * stepCents,
    };
  }, Array.from({ length: 90 }, (_, i) => i));
const FIXTURES: readonly CashflowCell[][] = [cellsClimbing(100_000), cellsClimbing(1_000_000)];

const PANEL_NAMES: Readonly<Record<PanelId, string>> = {
  a: "A cashflow",
  b: "B series",
  c: "C changes",
  d: "D rail",
};

const cell = (value: number | string, width: number): string =>
  String(value).padStart(width);

/** The four panels as the browser laid them out, in the model's own table
 *  shape so the two read side by side — plus the height of the first svg in
 *  each panel, which is what a fill chart actually got. */
const measuredTable = (frame: HTMLElement): string => {
  const origin = frame.getBoundingClientRect();
  const header = `${"panel".padEnd(12)}${cell("x", 6)}${cell("y", 6)}${cell("width", 7)}${cell("height", 8)}${cell("svg h", 7)}`;
  const rows = map((id: PanelId) => {
    const el = frame.querySelector<HTMLElement>(`[data-builder-board-panel="${id}"]`);
    if (el === null) return `${PANEL_NAMES[id].padEnd(12)}  (not rendered)`;
    const r = el.getBoundingClientRect();
    const svg = el.querySelector("svg");
    const svgHeight = svg === null ? "—" : Math.round(svg.getBoundingClientRect().height);
    return `${PANEL_NAMES[id].padEnd(12)}${cell(Math.round(r.left - origin.left), 6)}${cell(Math.round(r.top - origin.top), 6)}${cell(Math.round(r.width), 7)}${cell(Math.round(r.height), 8)}${cell(svgHeight, 7)}`;
  }, PANELS);
  return join("\n", [header, ...rows]);
};

/** A panel's stand-in: its name over a centred note. */
/** The words a gauge in D would say — what `calloutModeFor` sizes against. */
const GAUGE_LABELS = ["Current $1,240,000", "Baseline $1,100,000"];

const Placeholder: Component<{ title: string; note: string }> = (props) => (
  <>
    <TextTitle>{props.title}</TextTitle>
    <GrowCenterColumn>
      <NoteText>{props.note}</NoteText>
    </GrowCenterColumn>
  </>
);

const BuilderBoardBench: Component = () => {
  const [size, setSize] = createSignal<SizeId>("laptop");
  const [fixture, setFixture] = createSignal(0);
  const [measured, setMeasured] = createSignal("(measuring…)");
  let frame: HTMLDivElement | undefined;

  onMount(() => {
    if (frame === undefined) return;
    const target = frame;
    const observer = new ResizeObserver(() => setMeasured(measuredTable(target)));
    observer.observe(target);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="component-section component-section--full">
      <NarrowStack>
        <SpreadRow>
          <SectionTitle>Builder Board</SectionTitle>
          <SizePicker
            value={size()}
            onValueChange={(id) => setSize(id as SizeId)}
            aria-label="Viewport"
          />
        </SpreadRow>
        <NoteText>
          One frame, four slots. The rail is held to the gauge's natural width
          at every size; only the pane beside it moves.
        </NoteText>

        <ScrollXBox>
          <div
            ref={frame}
            class={`builder-board-bench__viewport builder-board-bench__viewport--${size()}`}
          >
            <BuilderBoard
              panelA={
                <>
                  <SpreadRow>
                    <TextTitle>Cash Flow</TextTitle>
                    <GhostButton onClick={() => setFixture((i) => 1 - i)}>
                      Swap fixture ({fixture() === 0 ? "$1k/day" : "$10k/day"})
                    </GhostButton>
                  </SpreadRow>
                  <GrowFillBox>
                    <StillCashflowScrubChart
                      cells={FIXTURES[fixture()]!}
                      scrub={false}
                      chartHeight="fill"
                      showGridlines
                      lineLabel="Balance"
                      yFitDomain={() => {
                        const cells = FIXTURES[fixture()]!;
                        return [0, cells[cells.length - 1]!.balanceCents];
                      }}
                    />
                  </GrowFillBox>
                </>
              }
              panelB={<Placeholder title="Series" note="panel B — the series being changed; clicking it inserts a time segment" />}
              panelC={<Placeholder title="Changes" note="panel C — the controls; fills what the rail leaves and scrolls inside its card" />}
              panelD={(box) => (
                <Placeholder
                  title="Cash, on average"
                  note={`panel D — the gauge, a stated width · box ${box().width}×${box().height} · ${calloutModeFor(box(), GAUGE_LABELS)}`}
                />
              )}
            />
          </div>
        </ScrollXBox>

        <TextTitle>Model — observeBuilderBoard({SIZES[size()].width}, {SIZES[size()].height})</TextTitle>
        <CodeBlock size="sm">{observeBuilderBoard(SIZES[size()])}</CodeBlock>
        <TextTitle>Measured — getBoundingClientRect on the rendered panels</TextTitle>
        <CodeBlock size="sm">{measured()}</CodeBlock>
      </NarrowStack>
    </div>
  );
};

export default BuilderBoardBench;
