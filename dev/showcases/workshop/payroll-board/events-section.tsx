// Payroll board — the EVENTS section (Peter's 2026-09-24 sketch).
//
// Element 3, above the chart: the change TABS, one per event in time order
// (tab N is flag N), labelled by the chart's own `abbreviateDates`. Picking a
// tab lights its flag and vice versa — one shared selection. A tab's × deletes
// that event; its changes go with it, so flags, rails and flows re-derive.
//
// Numbered, hoverable, draggable flags on the pay-levels chart. Drag a flag:
// the chart reports the new day (`onMoveMutation`), this section moves that
// event in its own state, and the levels and flows re-derive from it — the
// same loop a consumer runs. The observation under the chart is the flag and
// axis table the chart laid out, printed headlessly (`observe`).
//
// Lives in a SUBFOLDER on purpose: the bench discovery glob is
// `workshop/*.tsx`, so a file here is a section, never a bench of its own.
import { type Component, createMemo, createSignal } from "solid-js";
import { map } from "../../../../src/fn";
import { createLevelsTimeline } from "../../../../src/components/LevelsTimeline";
import { isoDayOf, pickDay } from "../../../../src/components/LevelsTimeline/geometry";
import { TightStack } from "../../../../src/components/Layout";
import { createMutationToolbar } from "../../../../src/components/MutationToolbar";
import { MonoDump, NoteText, TextTitle } from "../../../../src/components/Text";
import { createSegmentedControl } from "../../../../src/components/SegmentedControl";
import { SpreadRow } from "../../../../src/components/Layout";
import {
  DEFAULT_SPAN,
  PAY_EVENTS,
  PAY_VALUE_DOMAIN,
  SPANS,
  type SpanId,
  addEventAt,
  asThousands,
  moveEvent,
  observe,
  removeEvent,
  selectionAfterRemove,
  spanDomain,
  tabsOf,
  toTimeline,
} from "./events-model";

/**
 * The bench's chart variant. `pickDay` makes a click on the plot mean "a
 * change on THIS day" (Peter, 2026-09-24) — behaviour, so it is curried here
 * with the format, never passed at the call site.
 */
const PayLevelsChart = createLevelsTimeline({
  formatValue: asThousands,
  pickAt: pickDay,
});
const ChangesToolbar = createMutationToolbar({});
/** Bench-only: the projection span, one per tick cadence Peter named. */
const SpanPicker = createSegmentedControl({
  options: map((one) => ({ value: one.id, label: one.label }), [...SPANS]),
});

export const EventsSection: Component = () => {
  const [events, setEvents] = createSignal(PAY_EVENTS);
  const [selected, setSelected] = createSignal<string>();
  const [span, setSpan] = createSignal<SpanId>(DEFAULT_SPAN);
  const [lastMove, setLastMove] = createSignal(
    "Drag a flag along the axis, or click the plot to add a change.",
  );
  const domain = createMemo(() => spanDomain(span()));
  const timeline = createMemo(() => toTimeline(events(), domain()));

  const remove = (id: string): void => {
    setSelected(selectionAfterRemove(events(), id, selected(), domain()));
    setEvents((before) => removeEvent(before, id));
    setLastMove(`Deleted ${id}.`);
  };

  const add = (at: number): void => {
    const next = addEventAt(events(), at);
    setEvents(next.events);
    setSelected(next.id);
    setLastMove(`Added ${next.id} at ${isoDayOf(at)}.`);
  };

  return (
    <TightStack>
      <ChangesToolbar
        title="Changes"
        changes={tabsOf(events(), domain())}
        selected={selected() ?? null}
        onSelect={setSelected}
        onRemove={remove}
        emptyNote="No changes left."
      />
      <SpreadRow>
        <TextTitle>Pay levels through the year</TextTitle>
        <SpanPicker
          value={span()}
          onValueChange={(id) => setSpan(id as SpanId)}
          aria-label="Projection span"
        />
      </SpreadRow>
      <PayLevelsChart
        levels={timeline().levels}
        transfers={timeline().transfers}
        mutations={timeline().mutations}
        domain={domain()}
        valueDomain={PAY_VALUE_DOMAIN}
        selectedMutationId={selected()}
        onSelectMutation={(id) =>
          setSelected((before) => (before === id ? undefined : id))
        }
        onMoveMutation={(id, at) => {
          setEvents((before) => moveEvent(before, id, Number(at)));
          setLastMove(`Moved ${id} to ${isoDayOf(at)}.`);
        }}
        onPick={(at) => add(Number(at))}
      />
      <NoteText>{lastMove()}</NoteText>
      <MonoDump>{observe(events(), domain())}</MonoDump>
    </TightStack>
  );
};
