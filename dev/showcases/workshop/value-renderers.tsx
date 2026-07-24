// Workshop bench — Value Renderers across 3 hosts (2026-07-23).
//
// Validates the extraction: every value renderer is now container-agnostic —
// it owns its styling (co-located CSS) and assumes no <td>. The SAME renderer
// instance is rendered in three hosts side by side: a real table cell, a
// DataList <dd> (definition data), and a card slot. If a renderer looked right
// only in a table, this bench would expose it.
import { type Component, type JSX, For } from "solid-js";
import {
  // promoted value renderers (all barrel-exported)
  IdCell,
  StringCell,
  LongTextCell,
  MoneyCell,
  DurationCell,
  FloatCell,
  IntCell,
  MetricValueCell,
  DateCell,
  DateTimeCell,
  MinuteDateTimeCell,
  TagCell,
  StatusCell,
  CheckboxCell,
  NumberWithUnits,
  EllipsisText,
  // definition-data host
  DTable,
  DRow,
  DT,
  DD,
  // card host
  CompactSurface,
  // layout / text
  SectionTitle,
  SubsectionTitle,
  TextBody,
  TextSublabel,
  PageStack,
  TightStack,
  SpreadRow,
} from "../../../src";
import "./value-renderers.css";

// One renderer per row. `el` is a thunk so each host gets its own instance —
// which is exactly the point: same component, three containers.
const RENDERERS: { label: string; el: () => JSX.Element }[] = [
  { label: "IdCell", el: () => <IdCell value="xbox3-2" /> },
  { label: "StringCell", el: () => <StringCell value="MSC Bellissima" /> },
  {
    label: "LongTextCell",
    el: () => (
      <LongTextCell
        value="Instrument fault during control period — data excluded per SOP-14."
        maxLength={38}
        reveal="tooltip"
      />
    ),
  },
  { label: "MoneyCell", el: () => <MoneyCell value={128450.5} /> },
  { label: "FloatCell", el: () => <FloatCell value={2.834} precision={3} /> },
  { label: "IntCell", el: () => <IntCell value={12480} /> },
  { label: "DurationCell", el: () => <DurationCell value={9245} unit="s" /> },
  {
    label: "MetricValueCell",
    el: () => <MetricValueCell value={2.834} compliant={false} />,
  },
  { label: "DateCell", el: () => <DateCell value="2025-12-01" /> },
  { label: "DateTimeCell", el: () => <DateTimeCell value="2025-12-01T08:14:00" /> },
  {
    label: "MinuteDateTimeCell",
    el: () => <MinuteDateTimeCell value="2025-12-01T08:14:00" />,
  },
  { label: "TagCell", el: () => <TagCell value="Berth 402" variant="info" /> },
  { label: "StatusCell", el: () => <StatusCell value="completed" /> },
  { label: "CheckboxCell", el: () => <CheckboxCell value={true} /> },
  { label: "NumberWithUnits", el: () => <NumberWithUnits value={318} units="kW" /> },
  {
    label: "EllipsisText",
    el: () => (
      // A bounded parent is the host's job; here a 120px cap forces the clip so
      // the iff-tooltip is demonstrable. In a table that box is the <td>.
      <span class="vr-ellipsis-host">
        <EllipsisText tooltip="MSC Bellissima Grande Container Vessel of the MSC line" />
      </span>
    ),
  },
];

// Host 1 — real table cells.
const TableHost: Component = () => (
  <table class="vr-demo-table">
    <thead>
      <tr>
        <th>renderer</th>
        <th>in &lt;td&gt;</th>
      </tr>
    </thead>
    <tbody>
      <For each={RENDERERS}>
        {(r) => (
          <tr>
            <td>
              <TextSublabel>{r.label}</TextSublabel>
            </td>
            <td>
              {r.el()}
            </td>
          </tr>
        )}
      </For>
    </tbody>
  </table>
);

// Host 2 — definition data (DataList DT/DD).
const DefListHost: Component = () => (
  <DTable>
    <For each={RENDERERS}>
      {(r) => (
        <DRow border>
          <DT muted>{r.label}</DT>
          <DD>{r.el()}</DD>
        </DRow>
      )}
    </For>
  </DTable>
);

// Host 3 — card slot (positional, inside a compact surface).
const CardHost: Component = () => (
  <TightStack>
    <For each={RENDERERS}>
      {(r) => (
        <CompactSurface>
          <SpreadRow>
            <TextSublabel>{r.label}</TextSublabel>
            {r.el()}
          </SpreadRow>
        </CompactSurface>
      )}
    </For>
  </TightStack>
);

const Column: Component<{ title: string; hint: string; children: JSX.Element }> = (props) => (
  <div class="vr-column">
    <SubsectionTitle>{props.title}</SubsectionTitle>
    <TextSublabel>{props.hint}</TextSublabel>
    <div class="vr-column-body">{props.children}</div>
  </div>
);

const ValueRenderersBench: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>Value Renderers — one primitive, three hosts</SectionTitle>
    <TextBody>
      Each renderer owns its styling (co-located CSS) and assumes no{" "}
      <code>&lt;td&gt;</code>. The same component is rendered in a real table cell, a
      DataList <code>&lt;dd&gt;</code>, and a card slot. Identical output across the
      three columns is the proof that the renderers are container-agnostic.
    </TextBody>
    <PageStack>
      <div class="vr-host-row">
        <Column title="Table cell" hint="rendered inside a real <td>">
          <TableHost />
        </Column>
        <Column title="Definition data" hint="DataList <dt>/<dd>">
          <DefListHost />
        </Column>
        <Column title="Card slot" hint="positional, inside a CompactSurface">
          <CardHost />
        </Column>
      </div>
    </PageStack>
  </div>
);

export const meta = { label: "Value Renderers (3 hosts)" };

export default ValueRenderersBench;
