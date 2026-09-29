/**
 * Seasonal Builder bench — Peter's approved sketch of 2026-09-29 (sketch 3),
 * composed. Three regions on one page: a CALENDAR of named periods that repeat
 * every year, and two builders of ONE shape — SEASONAL WORKERS and SEASONAL WORK.
 *
 * Every component comes through the package barrel (`../../../src`), as a client
 * would import it. Component per region:
 *
 *   Calendar  — `ContentChartFrame` holding `CalendarStrip`
 *               (`seasonal-builder-kit/calendar-strip.tsx`): `Chart` + `XAxis` +
 *               `SpanLanes` (one per model lane) + `createSpanEndLabels` +
 *               `PinMarkers` + `ReferenceLine`. Below it a `LooseCardGrid` of the
 *               holiday and the range card (`period-cards.tsx`): `CompactSurface`,
 *               `NameInput`, `CompactDropdown`, `SegmentedControl`,
 *               `ThemedNumberInput`, `WarningBadge`.
 *   Workers / Work — `SeasonBuilder` (`season-builder.tsx`) twice: `CardSurface`,
 *               `ContentChartFrame` + `YearStrip` (`Chart`, `StackedAreaSeries`,
 *               `AreaSeries` with `lower`, `HatchPattern`, `ReferenceLine`),
 *               `GroupedMutationSliders` with a per-dial `caption` display, and
 *               a `TimingPanel` (`SegmentedControl` kind pills, `CurrencyInput`,
 *               `ThemedNumberInput`, `CompactDropdown`, `InfoBadge` /
 *               `WarningBadge`).
 *
 * BENCH-LOCAL, on purpose: the kit files above are compositions of the SUI parts
 * (no CSS, no inline style). What SUI has no part for — a labelled pin, a stack
 * with hover / selection / hatch, a compact value pick — is recorded with the
 * proposed component in `docs/handoffs/seasonal-builder-sui-gaps.md`.
 *
 * Every number and sentence is a pure function in `seasonal-builder-model.ts`,
 * pinned by `seasonal-builder-model.test.ts`.
 */
import { type Component, createMemo, createSignal } from "solid-js";
import {
  ContentChartFrame,
  ContentStack,
  LooseCardGrid,
  MutedBody,
  SectionTitle,
  TextSublabel,
  TightStack,
} from "../../../src";
import { CalendarStrip } from "./seasonal-builder-kit/calendar-strip";
import { HolidayCard, RangeCard } from "./seasonal-builder-kit/period-cards";
import { SeasonBuilder } from "./seasonal-builder-kit/season-builder";
import {
  type Holiday,
  type Period,
  type Range,
  holidaysOf,
  rangesOf,
  samplePeriods,
  sampleWork,
  sampleWorkers,
  setPeriod,
} from "./seasonal-builder-model";

export const meta = { label: "Seasonal Builder" };

const SeasonalBuilder: Component = () => {
  const [periods, setPeriods] = createSignal<readonly Period[]>(
    samplePeriods(),
  );
  const [picked, setPicked] = createSignal({ holiday: "tg", range: "wb" });
  const holiday = createMemo(
    () =>
      holidaysOf(periods()).find((p) => p.id === picked().holiday) as Holiday,
  );
  const range = createMemo(
    () => rangesOf(periods()).find((p) => p.id === picked().range) as Range,
  );
  /** A click on the strip or a picker: the id says which card it is for. */
  const select = (id: string) => {
    const hit = periods().find((p) => p.id === id);
    if (hit) setPicked((s) => ({ ...s, [hit.type]: hit.id }));
  };

  return (
    <ContentStack>
      <TightStack>
        <SectionTitle>Seasonal Builder</SectionTitle>
        <TextSublabel>Thorcasting · scenario builder · sketch 3</TextSublabel>
        <MutedBody>
          A season is a named stretch of the year with a level. Both of its ends
          are rules: a fixed day, a weekday of a month, a count of business
          days, a money threshold, or a stock that runs out. Rules that depend
          on money or stock give a projected date, which the fold settles when
          it runs (shown in amber, with a hatched end on the strip). Click a
          season's timing under its dial to edit its rules. The data is example
          data.
        </MutedBody>
      </TightStack>

      <ContentChartFrame title="Calendar · repeats every year">
        <TightStack>
          <CalendarStrip
            periods={periods()}
            selectedHoliday={picked().holiday}
            selectedRange={picked().range}
            onSelect={select}
          />
          <MutedBody>
            Named days and stretches of the year that seasons are built from.
            Each one repeats every year. Click one on the strip to edit it
            below.
          </MutedBody>
          <LooseCardGrid>
            <HolidayCard
              holiday={holiday()}
              periods={periods()}
              onPick={select}
              onChange={(next) => setPeriods((ps) => setPeriod(ps, next))}
            />
            <RangeCard
              range={range()}
              periods={periods()}
              onPick={select}
              onChange={(next) => setPeriods((ps) => setPeriod(ps, next))}
            />
          </LooseCardGrid>
        </TightStack>
      </ContentChartFrame>

      <SeasonBuilder
        id="workers"
        title="Seasonal workers"
        sub="Hourly crew who only work in season · Laborer role · 40 h/wk at $24/h"
        yTitle="Crew"
        unit="crew"
        initial={sampleWorkers()}
        initialSelected={2}
      />
      <SeasonBuilder
        id="work"
        title="Seasonal work"
        sub="Work that only happens in season · Holiday lighting stream"
        yTitle="Revenue ($/day)"
        unit="$/day"
        initial={sampleWork()}
        initialSelected={3}
      />
    </ContentStack>
  );
};

export default SeasonalBuilder;
