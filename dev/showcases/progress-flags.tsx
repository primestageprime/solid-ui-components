// ProgressFlags — one topic's progress as a step timeline with a flag per
// step: the dashed estimate, the solid actual, the area between them coloured
// by verdict, and a flag per step along the top with a drop line to its point.
//
// The showcase plays the CONSUMER: a tracker that records receipts and steps
// for a topic. It passes data only (a title, a trace, an as-of cut) to
// `StepProgressFlags`, the variant SUI ships with the y axis worded "Planned
// minutes earned" and a tolerance of half the minutes planned so far. Under
// "Ahead", the one real topic, the receipts it is built from sit in a
// FieldTable; hovering a row lights that step's flag and drop line, and
// hovering or pressing a flag reports the step number back. That link is the
// whole reason hover and selection are 1-based step numbers rather than the
// chart's slot ids.
//
// Six scenarios, in order: on target (all accent), in progress (cut at +12m,
// one current flag, planned flags hollow), ahead (the real trace), behind,
// over and under (all three verdicts), and procrastinate (idle after the
// claim).
import { type Component, Index, Show, createSignal } from "solid-js";
import { Icon, type IconName } from "../../src/components/Icon";
import { NarrowStack, SpacedStack, TightStack, ViewportColumn } from "../../src/components/Layout";
import {
  type ProgressTrace,
  type ProgressTraceReceiptKind,
  type ProgressReceiptRow,
  StepProgressFlags,
  progressReceiptRows,
} from "../../src/components/ProgressFlags";
import { type ProgressScenario, SCENARIOS } from "../../src/components/ProgressFlags/fixtures";
import { MIN_MS, startOf } from "../../src/components/ProgressFlags/model";
import * as fields from "../../src/components/Table/fields";
import { FieldTable } from "../../src/components/Table/fields";
import { MutedBody, SectionTitle, SubsectionTitle } from "../../src/components/Text";
import { Tooltip } from "../../src/components/Tooltip";

/** The consumer's glyph for each receipt kind: its vocabulary, not the chart's. */
const KIND_ICON: Record<ProgressTraceReceiptKind, IconName> = {
  Claimed: "log-in",
  Released: "log-out",
  Estimated: "hourglass",
  StepsSet: "menu",
  StepStarted: "arrow-right",
  StepDone: "check",
  Milestone: "chart-line",
  Parked: "pause",
  Blocked: "lock",
  Unblocked: "lock-open",
  ApprovalRequested: "bell",
  Approved: "user",
  Lapsed: "warning",
  Dismissed: "close",
};

const kindCell = (row: ProgressReceiptRow) => (
  <Tooltip content={row.kind} triggerAs="span">
    <Icon name={KIND_ICON[row.kind]} size="sm" aria-label={row.kind} />
  </Tooltip>
);

const estimateCell = (r: ProgressReceiptRow) => r.estimate;
const actualCell = (r: ProgressReceiptRow) => r.actual;

const RECEIPT_FIELDS = ["elapsed", "kind", "detail", "estimate", "actual"];
const RECEIPT_REGISTRY = {
  elapsed: fields.textCol<ProgressReceiptRow>("elapsed"),
  kind: fields.col<ProgressReceiptRow>("kind", "Kind", kindCell, "status"),
  detail: fields.textCol<ProgressReceiptRow>("detail"),
  estimate: fields.col<ProgressReceiptRow>("estimate", "Est. duration", estimateCell, "duration"),
  actual: fields.col<ProgressReceiptRow>("actual", "Actual duration", actualCell, "duration"),
};

/** The cut for a scenario, as the component wants it: epoch ms, or undefined for the whole trace. */
const asOfFor = (topic: ProgressTrace, nowMin: number | undefined): number | undefined =>
  nowMin === undefined ? undefined : startOf(topic) + nowMin * MIN_MS;

/** One scenario: its framed chart and, for the real topic, the receipts it is built from. */
const ScenarioSection: Component<{ readonly scenario: ProgressScenario }> = (props) => {
  const [hovered, setHovered] = createSignal<number | undefined>(undefined);
  const [selected, setSelected] = createSignal<number | undefined>(undefined);
  const hoverRow = (row: ProgressReceiptRow | null): void => {
    setHovered(row?.step);
  };
  return (
    <TightStack>
      <StepProgressFlags
        title={props.scenario.name}
        trace={props.scenario.topic}
        asOf={asOfFor(props.scenario.topic, props.scenario.nowMin)}
        hoveredStep={hovered()}
        onHoverStep={setHovered}
        selectedStep={selected()}
        onSelectStep={setSelected}
      />
      <MutedBody>{props.scenario.topic.title}</MutedBody>
      <Show when={props.scenario.name === "Ahead"}>
        <SubsectionTitle>The receipts behind it</SubsectionTitle>
        <MutedBody>
          Hover a row to light its step's flag; hover or press a flag to get the step number back
          {selected() === undefined ? "." : ` (selected: step ${selected()}).`}
        </MutedBody>
        <FieldTable
          data={[...progressReceiptRows(props.scenario.topic)]}
          fields={RECEIPT_FIELDS}
          registry={RECEIPT_REGISTRY}
          maxRows={14}
          onRowHover={hoverRow}
        />
      </Show>
    </TightStack>
  );
};

export const ProgressFlagsShowcase: Component = () => (
  <div class="component-section component-section--full">
    <ViewportColumn>
      <SpacedStack>
        <TightStack>
          <SectionTitle>ProgressFlags</SectionTitle>
          <MutedBody>
            Dashed: estimate. Solid: actual. Accent: within tolerance. Purple: ahead of it. Red:
            behind it. Flags: grey done, cyan current, outline planned. Every chart below is
            `StepProgressFlags` given a title, a trace and (for "In progress") an as-of cut.
          </MutedBody>
        </TightStack>
        <NarrowStack>
          <Index each={SCENARIOS}>{(sc) => <ScenarioSection scenario={sc()} />}</Index>
        </NarrowStack>
      </SpacedStack>
    </ViewportColumn>
  </div>
);
