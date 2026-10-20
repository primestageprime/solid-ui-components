import { createSignal, type Component } from "solid-js";
import {
  ConfiguredCard,
  ConfiguredLog,
  GroupedSelector,
  LocalizationSettings,
  LogLineList,
  SectionTable,
  SharingSettings,
  TextBody,
  type SelectorGroup,
} from "../../src";
import { defineCard, defineChildren, defineSide } from "../../src/unstable";

type Bird = { id: string; name: string };
const GROUPS: SelectorGroup<Bird, "pond" | "wood">[] = [
  { id: "pond", title: "By the pond", count: 2, collapsed: false, items: [{ id: "a", name: "Heron" }, { id: "b", name: "Duck" }] },
  { id: "wood", title: "In the wood", count: 1, collapsed: false, items: [{ id: "c", name: "Owl" }] },
];
type Line = { id: string; at: string; text: string };
const LINES: Line[] = [
  { id: "1", at: "12:00:01", text: "started" },
  { id: "2", at: "12:00:09", text: "a long line of text that is cut with an ellipsis instead of widening the panel" },
];

type Stop = { id: string; name: string; status: "idle" | "live" | "over"; startedAt?: string; completedAt?: string; log: Line[] };
type Trip = { id: string; title: string; by: string; createdAt: string; stops: Stop[]; focus?: string };
const stops = defineChildren({
  key: "stops",
  status: { pending: "idle", current: "live", complete: "over" },
  lines: { started: "Left", completed: "Arrived", reopened: "Back" },
});
const TRIP: Trip = { id: "t", title: "Alps", by: "Ada", createdAt: "2026-01-01T00:00:00.000Z", stops: stops.advance({ id: "t", title: "Alps", by: "Ada", createdAt: "2026-01-01T00:00:00.000Z", stops: [stops.child("s1", { name: "Train" }) as Stop, stops.child("s2", { name: "Hike" }) as Stop] }).stops as Stop[] };
const TRIP_CARD = defineCard<Trip>({
  title: (t) => t.title,
  status: { of: (t) => stops.kindOf(t), map: { pending: { label: "Planned", variant: "inactive" }, current: { label: "Going", variant: "active" }, complete: { label: "Done", variant: "success" } } },
  detail: (t) => `${stops.progress(t).done} of ${stops.progress(t).total} stops`,
  who: (t) => t.by,
  when: (t) => stops.activityAt(t),
});
const TRIP_LOG = defineSide<Trip, Line>({ title: "Log", emptyLabel: "Nothing yet", rowsOf: (t) => stops.pick(t)?.log ?? [], at: (l) => l.at, text: (l) => l.text });

export const ListDetailPartsShowcase: Component = () => {
  const [selected, setSelected] = createSignal<string | null>("a");
  const [collapsed, setCollapsed] = createSignal<string[]>([]);
  return (
    <div class="component-section">
      <h2>GroupedSelector</h2>
      <p class="text-meta">
        A kit's <code>grouped()</code> as a rail: title and count chip per group, controlled collapse, the selected
        item marked. Pass <code>kit</code> for the wired form; these props serve any list.
      </p>
      <div class="example-group">
        <GroupedSelector
          groups={GROUPS.map((g) => ({ ...g, collapsed: collapsed().includes(g.id) }))}
          selectedId={selected()}
          onSelect={setSelected}
          onToggleGroup={(id) => setCollapsed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))}
          renderItem={(b) => <TextBody>{b.name}</TextBody>}
        />
      </div>

      <h2>ConfiguredCard and ConfiguredLog</h2>
      <p class="text-meta">
        An item in the rail and the right-hand log drawn from plain-data configs (<code>defineCard</code>,{" "}
        <code>defineSide</code>); <code>defineChildren</code> supplies the progress, the kind and the log rows.{" "}
        <code>ConfiguredDetail</code> takes a <code>defineDetail</code> config and a kit the same way.
      </p>
      <div class="example-group">
        <ConfiguredCard item={TRIP} config={TRIP_CARD} />
        <ConfiguredLog
          kit={{ live: () => [TRIP], state: { view: { selectedId: "t" } }, ui: { editing: () => false }, actions: { update: () => {}, primary: () => {} } }}
          config={TRIP_LOG}
        />
      </div>

      <h2>LogLineList</h2>
      <p class="text-meta">Time + text rows for a narrow panel: fixed time column, truncating text, empty state.</p>
      <div class="example-group">
        <LogLineList rows={LINES} timeOf={(l) => l.at} textOf={(l) => l.text} title="Output" />
        <LogLineList rows={[] as Line[]} timeOf={(l) => l.at} textOf={(l) => l.text} emptyLabel="Nothing logged" />
      </div>

      <h2>Selected table row</h2>
      <p class="text-meta">
        <code>selectedId</code> + <code>onSelect</code> on BaseTable / SectionTable; <code>highlighted</code> stays
        hover-only.
      </p>
      <div class="example-group">
        <SectionTable
          title="Birds"
          data={GROUPS[0].items}
          columns={[{ id: "name", header: "Name", accessor: (b: Bird) => b.name }]}
          selectedId={selected()}
          onSelect={setSelected}
        />
      </div>

      <h2>LocalizationSettings and SharingSettings</h2>
      <p class="text-meta">The generic settings tab bodies, on a persisted stub model (or driven by value + onChange).</p>
      <div class="example-group">
        <LocalizationSettings />
        <SharingSettings />
      </div>
    </div>
  );
};
