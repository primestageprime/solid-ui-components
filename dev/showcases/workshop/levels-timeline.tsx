/**
 * Levels Timeline bench — the stepped multi-series chart from Peter's pencil
 * sketch (2026-09-16).
 *
 * The bench plays the CONSUMER, which is where every domain decision belongs:
 * it owns the cards and their titles, the 2025-01 → 2026-01 span, the people,
 * the $/mo levels each of them holds, and the pre-computed "Total" line. The
 * chart is handed series, mutations and a domain, and paints. It totals
 * nothing, formats nothing and decides no units — the Total series here is the
 * consumer's own arithmetic, done once, above.
 *
 * Two situations:
 *   1. a static card — the plain readout, flags inert;
 *   2. a selectable one — the flags are buttons wired to a signal, so a
 *      selected mutation lights its rule and its flag and mutes the others.
 */
import { createSignal, type Component } from "solid-js";
import { LevelsTimeline } from "../../../src/components/LevelsTimeline";
import type {
  Mutation,
  Series,
  TimeDomain,
} from "../../../src/components/LevelsTimeline";
import { CardSurface } from "../../../src/components/Surface";
import {
  CaptionLabel,
  MutedBody,
  SectionTitle,
  TextTitle,
} from "../../../src/components/Text";
import { SpacedStack, TightStack } from "../../../src/components/Layout";

export const meta = { label: "Levels Timeline" };

/** The span both cards are drawn against: a calendar year plus its closing edge. */
const DOMAIN: TimeDomain = [new Date("2025-01-01"), new Date("2026-01-01")];

/** The three numbered events every series is read against. */
const MUTATIONS: readonly Mutation[] = [
  { id: "spring", at: new Date("2025-04-01"), label: "1" },
  { id: "summer", at: new Date("2025-07-01"), label: "2" },
  { id: "autumn", at: new Date("2025-10-01"), label: "3" },
];

/**
 * Four people holding a monthly level, plus the total the consumer has already
 * added up. Not everyone steps at every mutation — that is the whole point of
 * the numbered rules: you read DOWN a rule to see who moved at it.
 */
const SERIES: readonly Series[] = [
  {
    id: "peter",
    label: "Peter",
    points: [
      { at: new Date("2025-01-01"), level: 12000 },
      { at: new Date("2025-04-01"), level: 15000 },
      { at: new Date("2025-10-01"), level: 14000 },
    ],
  },
  {
    id: "adlai",
    label: "Adlai",
    points: [
      { at: new Date("2025-01-01"), level: 8000 },
      { at: new Date("2025-07-01"), level: 9500 },
    ],
  },
  {
    id: "elaina",
    label: "Elaina",
    points: [
      { at: new Date("2025-04-01"), level: 6000 },
      { at: new Date("2025-10-01"), level: 7500 },
    ],
  },
  {
    id: "reilly",
    label: "Reilly",
    points: [
      { at: new Date("2025-01-01"), level: 5000 },
      { at: new Date("2025-07-01"), level: 4200 },
      { at: new Date("2025-10-01"), level: 6100 },
    ],
  },
  {
    id: "total",
    label: "Total",
    primary: true,
    points: [
      { at: new Date("2025-01-01"), level: 25000 },
      { at: new Date("2025-04-01"), level: 34000 },
      { at: new Date("2025-07-01"), level: 34700 },
      { at: new Date("2025-10-01"), level: 37600 },
    ],
  },
];

/** The plain readout: no selection wired, so the flags stay inert marks. */
const StaticCard: Component = () => (
  <CardSurface>
    <TightStack>
      <TextTitle>Levels through the year</TextTitle>
      <LevelsTimeline series={SERIES} mutations={MUTATIONS} domain={DOMAIN} />
      <CaptionLabel>
        Elaina's line starts at mutation 1 rather than at the domain edge: the
        chart draws nothing before a series' first point, because it will not
        invent a level it was not given.
      </CaptionLabel>
    </TightStack>
  </CardSurface>
);

/** The selectable one. The signal is the consumer's, not the chart's. */
const SelectableCard: Component = () => {
  const [selected, setSelected] = createSignal<string | undefined>("summer");
  const chosen = () => MUTATIONS.find((m) => m.id === selected());
  return (
    <CardSurface>
      <TightStack>
        <TextTitle>Levels, by mutation</TextTitle>
        <LevelsTimeline
          series={SERIES}
          mutations={MUTATIONS}
          domain={DOMAIN}
          selectedMutationId={selected()}
          onSelectMutation={setSelected}
        />
        <CaptionLabel>
          Showing mutation {chosen()?.label ?? "—"}. Click a numbered flag, or
          tab to one and press Enter — the selected rule lights in the accent
          and the others mute, so one column of risers stands out.
        </CaptionLabel>
      </TightStack>
    </CardSurface>
  );
};

const LevelsTimelineBench: Component = () => (
  <div class="component-section component-section--full">
    <SpacedStack>
      <TightStack>
        <SectionTitle>Levels Timeline</SectionTitle>
        <MutedBody>
          Several series held as levels in $/mo, stepping at three numbered
          mutations. Horizontal runs joined by vertical risers (step-after); the
          heavier dark line is the consumer's own pre-computed Total. Every
          number the chart paints is decided in geometry.ts and printed as a
          table by its tests — run{" "}
          <code>npx vitest run src/components/LevelsTimeline</code> to read the
          shape without a browser.
        </MutedBody>
      </TightStack>
      <StaticCard />
      <SelectableCard />
    </SpacedStack>
  </div>
);

export default LevelsTimelineBench;
