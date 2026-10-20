import { createSignal, type Component } from "solid-js";
import {
  ConfiguredCard,
  ConfiguredLog,
  EqualRow,
  GroupedSelector,
  HatchedProgressBar,
  HotkeyButton,
  LocalizationSettings,
  LogLineList,
  ConfiguredDetail,
  RowCard,
  SectionTable,
  SharingSettings,
  TextBody,
  type SelectorGroup,
} from "../../src";
import { defineCard, defineChildren, defineDetail, defineSide, flowSection } from "../../src/unstable";

/** A sequence as a sketch draws it: three done steps, the active one, the next; the detail draws it as a flow. */
type Step = { id: string; label: string; size: "done" | "active" | "next"; description?: string; estimate?: string; actual?: string; gap?: string };
type Job = { id: string; title: string; steps: Step[]; focus?: string };
const JOB: Job = {
  id: "job",
  title: "Write release notes",
  steps: [
    { id: "n1", label: "Gather", size: "done", gap: "18 min" },
    { id: "n2", label: "Group by area", size: "done", gap: "1h 2 min" },
    { id: "n3", label: "Draft", size: "done", gap: "3 min" },
    { id: "n4", label: "Review wording", size: "active", description: "Read the draft aloud, cut what nobody would miss, and check every link opens.", estimate: "12 min", actual: "3:02" },
    { id: "n5", label: "Publish", size: "next", estimate: "2 min" },
  ],
  focus: "n4",
};
const JOB_DETAIL = defineDetail<Job>({
  emptyLabel: "Pick a job",
  titleField: "title",
  titleSize: "lg",
  chip: () => "Anna",
  action: { hotkey: "d", label: "Done", icon: "check", placement: "activeNode" },
  sections: [
    flowSection<Job, Step>({
      rowsOf: (j) => j.steps,
      nodeOf: (st) => ({
        label: st.label,
        size: st.size,
        description: st.description,
        estimate: st.estimate,
        actual: st.actual,
        progress: st.size === "done" ? { done: 1, total: 1 } : st.size === "active" ? { done: 0, active: 0.25, total: 1 } : undefined,
      }),
      edgeLabelOf: (prev) => prev.gap,
      selectedOf: (j) => j.focus,
    }),
  ],
});

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

      <h2>GroupedSelector, flush</h2>
      <p class="text-meta">
        <code>variant="flush"</code>: compact group rows (title, boxed count), hairlines, no +/- glyph, an accent
        bar on the selected row and its group. The items here are <code>RowCard</code>s with a{" "}
        <code>HatchedProgressBar</code> (solid done, hatched active).
      </p>
      <div class="example-group">
        <GroupedSelector
          variant="flush"
          groups={GROUPS.map((g) => ({ ...g, collapsed: collapsed().includes(g.id) }))}
          selectedId={selected()}
          onSelect={setSelected}
          onToggleGroup={(id) => setCollapsed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))}
          renderItem={(b, ctx) => (
            <RowCard
              name={b.name}
              aside={ctx.group.title}
              bar={<HatchedProgressBar done={b.id === "a" ? 2 : 1} active={1} total={4} label={b.name} />}
            />
          )}
        />
      </div>

      <h2>EqualRow and Button casing</h2>
      <p class="text-meta">
        Two buttons split a toolbar evenly (<code>EqualRow</code>); <code>casing="normal"</code> keeps the label as
        written under a theme that sets caps.
      </p>
      <div class="example-group">
        <EqualRow>
          <HotkeyButton hotkey="s" icon="arrows-up-down" armed={false} casing="normal">Oldest</HotkeyButton>
          <HotkeyButton hotkey="n" armed={false} casing="normal">Create</HotkeyButton>
        </EqualRow>
      </div>

      <h2>ConfiguredDetail with a flow section</h2>
      <p class="text-meta">
        <code>flowSection()</code> draws the selected item's steps on a <code>SwimlaneChart</code> (stacked routing,
        edge labels, fixed column gap): done steps stacked left, the active step large at the centre with the
        description, estimate / actual, bar and the primary action (<code>action.placement: "activeNode"</code>),
        the next step right. A step changing column animates (the chart keys nodes by id).
      </p>
      <div class="example-group">
        <ConfiguredDetail
          kit={{ live: () => [JOB], state: { view: { selectedId: "job" } }, ui: { editing: () => false }, actions: { update: () => {}, primary: () => {} } }}
          config={JOB_DETAIL}
        />
      </div>

      <h2>LogLineList, plain</h2>
      <p class="text-meta">
        <code>variant="plain"</code>: heading only, no column headers, time left and wrapped text right, airy rows;{" "}
        <code>timeFormat="minutes"</code> drops the seconds.
      </p>
      <div class="example-group">
        <LogLineList
          variant="plain"
          rows={LINES}
          timeOf={(l) => l.at.slice(0, 5)}
          textOf={(l) => l.text}
          title="Logs"
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
