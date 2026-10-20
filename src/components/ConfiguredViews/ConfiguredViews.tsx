// ConfiguredViews (Depth 2, composes StatusCard / StatusCell / EditableTitle / SectionTable / HotkeyButton /
// Tags: shows:card, shows:log, shows:status, does:view, data:scalar, data:list, role:panel
// LogLineList). The three panels of a list-and-detail app drawn from plain-data configs (see
// listDetail/views.ts) and a defineListDetail kit: the card in the rail, the centre panel for the selected
// item, and the right-hand log. The app writes the config; the structure is here. No app nouns.
import { For, type JSX, Show } from "solid-js";
import { filter, find, findIndex, map } from "../../fn";
import { editKey } from "../../listDetail/focus";
import type { ListItem } from "../../listDetail/listkit";
import type {
  CardConfig,
  DetailConfig,
  DetailSection,
  FlowNodeSpec,
  FlowSection,
  SideConfig,
  TableSection,
} from "../../listDetail/views";
import { TagPill } from "../Badge/TagPill";
import { RowCard } from "../Card/RowCard";
import { StatusCard } from "../Card/StatusCard";
import { EditableTitle } from "../EditableTitle/EditableTitle";
import { MutedEmptyState } from "../Feedback/variants";
import { HotkeyButton } from "../HotkeyButton/HotkeyButton";
import { Icon } from "../Icon/Icon";
import { BaselineSpreadRow, FillColumn, TightClusterRow, TightStack, TopSpreadRow } from "../Layout/variants";
import { LogLineList } from "../LogLineList/LogLineList";
import { HatchedProgressBar } from "../Progress/HatchedProgressBar";
import type { DAGEdge, DAGNode } from "../DagChart/types";
import { createSwimlaneChart } from "../SwimlaneChart/SwimlaneChart";
import { SectionTable } from "../Table/SectionTable";
import { StatusCell } from "../Table/statusCells";
import { CaptionLabel, SectionTitle } from "../Text/variants";
import "./ConfiguredViews.css";

/** The slice of a defineListDetail kit the detail and side panels read and drive. */
export type ConfiguredKit<T extends ListItem> = {
  live: () => T[];
  state: { view: { selectedId: string | null } };
  ui: { editing: () => boolean };
  actions: {
    update(id: string, patch: Partial<T>): void;
    primary(): void;
  };
};

const selectedOf = <T extends ListItem>(kit: ConfiguredKit<T>): T | undefined =>
  find((e) => e.id === kit.state.view.selectedId, kit.live());

/** The time today, else the short date: the form a card's `when` takes. */
export const whenLabel = (
  value: string | number | Date,
  now: Date = new Date(),
): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export interface ConfiguredCardProps<T> {
  item: T;
  config: CardConfig<T>;
}

/** One item in the rail, drawn from a CardConfig: a StatusCard, or with `layout: "row"` a RowCard
 *  (title + who, then the progress bar while anything is done or active). */
export function ConfiguredCard<T>(props: ConfiguredCardProps<T>) {
  const c = () => props.config;
  const progress = () => c().progress?.(props.item);
  const underway = () => {
    const p = progress();
    return p !== undefined && p.total > 0 && p.done + (p.active ?? 0) > 0;
  };
  return (
    <Show
      when={c().layout !== "row"}
      fallback={
        <RowCard
          name={c().title(props.item)}
          aside={
            <Show when={c().who || c().marker}>
              <span class="sui-configured-card__aside">
                {c().who?.(props.item)}
                <Show when={c().marker?.(props.item)}>
                  {(m) => <Icon name={m()} size="sm" aria-label={c().markerLabel?.(props.item)} title={c().markerLabel?.(props.item)} />}
                </Show>
              </span>
            </Show>
          }
          bar={
            <>
              <Show when={underway() ? progress() : undefined}>
                {(p) => <HatchedProgressBar done={p().done} active={p().active} total={p().total} label={c().title(props.item)} />}
              </Show>
              <Show when={c().foot}>
                {(f) => (
                  <BaselineSpreadRow class="sui-configured-card__foot">
                    <span>{f().left?.(props.item)}</span>
                    <span>{f().right?.(props.item)}</span>
                  </BaselineSpreadRow>
                )}
              </Show>
            </>
          }
        />
      }
    >
    <StatusCard
      name={c().title(props.item)}
      status={
        c().status ? (
          <StatusCell
            value={c().status?.of(props.item)}
            statusMap={c().status?.map}
          />
        ) : undefined
      }
      description={c().detail?.(props.item)}
      claimedBy={c().who?.(props.item)}
      estimate={c().when ? whenLabel(c().when?.(props.item) ?? "") : undefined}
    />
    </Show>
  );
}

export interface ConfiguredDetailProps<T extends ListItem> {
  kit: ConfiguredKit<T>;
  config: DetailConfig<T>;
}

function TableSectionView<T>(props: { section: TableSection<T, object>; item: T }) {
  const s = () => props.section;
  return (
    <SectionTable
      title={s().title}
      countNoun={s().countNoun}
      data={s().rowsOf(props.item)}
      columns={s().columns}
      emptyMessage={s().emptyLabel}
      selectedId={s().selectedOf?.(props.item)}
      onSelect={(id: string) => s().onSelect?.(props.item, id)}
      fixedLayout
      fill
    />
  );
}

/** One node of a flow section: the caller's spec plus the row's id. */
export type FlowNode = FlowNodeSpec & { id: string };

/** The rows of a flow section as nodes and the labels of the edges between consecutive rows. */
export const flowNodesOf = <T,>(
  section: FlowSection<T, object>,
  item: T,
): { nodes: FlowNode[]; edgeLabels: (string | undefined)[] } => {
  const rows = section.rowsOf(item);
  const nodes = map((r: object) => ({ ...section.nodeOf(r, item), id: (r as { id: string }).id }), rows);
  const edgeLabels = map(
    (r: object, i: number) => (i < rows.length - 1 ? section.edgeLabelOf?.(r, rows[i + 1], item) : undefined),
    rows,
  );
  return { nodes, edgeLabels };
};

/** Flow nodes as a SwimlaneChart's DAG: one edge per consecutive pair, carrying its label. */
export const flowEdgesOf = (nodes: FlowNode[], edgeLabels: (string | undefined)[]): DAGEdge[] =>
  map(
    (n: FlowNode, i: number) => ({ source: n.id, target: nodes[i + 1].id, label: edgeLabels[i] }),
    nodes.slice(0, -1),
  );

/** The signed column of a flow node: done steps left of the centre, the active step at it, next ones right. */
export const flowColumnOf = (n: FlowNodeSpec): number => (n.size === "done" ? -1 : n.size === "active" ? 0 : 1);

// The flow's geometry, sized so three columns fit the centre panel of a 1280 px list-detail page beside
// a wide log column (70 + 216 + 216 + 70 = 572 px): small step cards, a wide active card, a 36 px gutter.
const FLOW_SIDE_SIZE: [number, number] = [140, 56];
const FLOW_ACTIVE_SIZE: [number, number] = [220, 236];
const FLOW_GUTTER = 36;
const FLOW_ROW_GAP = 100;
const FLOW_V_PAD = 24;
const FLOW_COLUMN_GAP = (FLOW_ACTIVE_SIZE[0] + FLOW_SIDE_SIZE[0]) / 2 + FLOW_GUTTER;

/** SwimlaneChart curried for a step flow: every node visible, columns at a fixed gap, stacked routing, no pan. */
const StepFlowChart = createSwimlaneChart<FlowNode>({
  maxDepth: 99,
  responsiveCollapse: false,
  fitColumns: false,
  centerCol: 0,
  columnGap: FLOW_COLUMN_GAP,
  rowGap: FLOW_ROW_GAP,
  rowOrder: "input",
  align: "start",
  nodeSize: (n: DAGNode<FlowNode>) => (n.data.size === "active" ? FLOW_ACTIVE_SIZE : FLOW_SIDE_SIZE),
  interactive: false,
  arrows: true,
});

/** The chart's height: the tallest column (a stack of small cards, or the active card) plus padding. */
export const flowHeightOf = (nodes: FlowNode[]): number => {
  const count = (size: FlowNodeSpec["size"]) => filter((n: FlowNode) => n.size === size, nodes).length;
  const rows = Math.max(count("done"), count("next"), 1);
  const stack = (rows - 1) * FLOW_ROW_GAP + FLOW_SIDE_SIZE[1];
  const centre = count("active") > 0 ? FLOW_ACTIVE_SIZE[1] : FLOW_SIDE_SIZE[1];
  return Math.max(stack, centre) + 2 * FLOW_V_PAD;
};

/** One node card: label, and on the active node the description, estimate / actual, bar and action. */
function FlowNodeCard(props: {
  node: FlowNode;
  selected: boolean;
  estimateLabel: string;
  actualLabel: string;
  action?: JSX.Element;
}) {
  const n = () => props.node;
  return (
    <div class={`sui-flow-node sui-flow-node--${n().size}`} data-node-id={n().id} aria-selected={props.selected}>
      <TightStack>
        <span class="sui-flow-node__label" title={n().label}>
          {n().label}
        </span>
        <Show when={n().size === "active" && n().description}>
          <p class="sui-flow-node__description">{n().description}</p>
        </Show>
        <Show when={n().size === "active" && (n().estimate || n().actual)}>
          <BaselineSpreadRow>
            <span class="sui-flow-node__meta">{n().estimate ? `${props.estimateLabel} ${n().estimate}` : ""}</span>
            <span class="sui-flow-node__meta">{n().actual ? `${props.actualLabel} ${n().actual}` : ""}</span>
          </BaselineSpreadRow>
        </Show>
        <Show when={n().size === "next" && n().estimate}>
          <span class="sui-flow-node__meta">{`${props.estimateLabel.toLowerCase()} ${n().estimate}`}</span>
        </Show>
        <Show when={n().size !== "next" && n().progress}>
          {(p) => <HatchedProgressBar done={p().done} active={p().active} total={p().total} label={n().label} />}
        </Show>
        <Show when={n().size === "active" && props.action != null}>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: click-isolation barrier so the action's click does not also select the node. */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick only stops propagation. */}
          <div class="sui-flow-node__action" onClick={(e) => e.stopPropagation()}>
            {props.action}
          </div>
        </Show>
      </TightStack>
    </div>
  );
}

function FlowSectionView<T>(props: { section: FlowSection<T, object>; item: T; action?: JSX.Element }) {
  const s = () => props.section;
  const flow = () => flowNodesOf(s(), props.item);
  const dagNodes = (): DAGNode<FlowNode>[] => map((n: FlowNode) => ({ id: n.id, data: n }), flow().nodes);
  const dagEdges = (): DAGEdge[] => flowEdgesOf(flow().nodes, flow().edgeLabels);
  const selectedId = () => s().selectedOf?.(props.item);
  return (
    <TightStack>
      <Show when={s().title}>
        <SectionTitle>{s().title}</SectionTitle>
      </Show>
      <Show
        when={flow().nodes.length > 0}
        fallback={<span class="sui-flow-node__empty">{s().emptyLabel ?? "Nothing yet"}</span>}
      >
        <div class="sui-configured-flow" style={{ height: `${flowHeightOf(flow().nodes)}px` }}>
          <StepFlowChart
            nodes={dagNodes()}
            edges={dagEdges()}
            swimlaneFor={(n) => flowColumnOf(n.data)}
            routingStyle="stacked"
            onNodeClick={(id) => s().onSelect?.(props.item, id)}
            renderNode={(n) => (
              <FlowNodeCard
                node={n.data}
                selected={selectedId() === n.id}
                estimateLabel={s().estimateLabel ?? "Est"}
                actualLabel={s().actualLabel ?? "Act"}
                action={n.data.size === "active" ? props.action : undefined}
              />
            )}
          />
        </div>
      </Show>
    </TightStack>
  );
}

function Section<T>(props: { section: DetailSection<T>; item: T; action?: JSX.Element }) {
  return (
    <Show
      when={props.section.kind === "flow" ? (props.section as FlowSection<T, object>) : undefined}
      fallback={<TableSectionView section={props.section as TableSection<T, object>} item={props.item} />}
    >
      {(flow) => <FlowSectionView section={flow()} item={props.item} action={props.action} />}
    </Show>
  );
}

/** The centre panel for the selected item, drawn from a DetailConfig. */
export function ConfiguredDetail<T extends ListItem>(
  props: ConfiguredDetailProps<T>,
) {
  const c = () => props.config;
  const selected = (): T | undefined => selectedOf(props.kit);
  const onActiveNode = () => c().action?.placement === "activeNode";
  const onToolbar = () => c().action?.placement === "toolbar";
  const firstFlow = () => findIndex((s: DetailSection<T>) => s.kind === "flow", c().sections);
  const actionButton = () => (
    <Show when={c().action}>
      {(a) => (
        <HotkeyButton
          hotkey={a().hotkey}
          icon={a().icon}
          armed={false}
          size={onToolbar() ? "sm" : undefined}
          casing={onActiveNode() || onToolbar() ? "normal" : undefined}
          onTrigger={() => props.kit.actions.primary()}
        >
          {a().label}
        </HotkeyButton>
      )}
    </Show>
  );
  /** The ruled toolbar row: the primary button, then the caller's extra actions, compact and normal-case. */
  const toolbar = (item: T) => (
    <TightClusterRow class="sui-configured-detail__toolbar">
      {actionButton()}
      <For each={c().actions ?? []}>
        {(a) => (
          <HotkeyButton hotkey={a.hotkey} icon={a.icon} armed={false} size="sm" casing="normal" onTrigger={() => a.onTrigger(item)}>
            {a.label}
          </HotkeyButton>
        )}
      </For>
    </TightClusterRow>
  );
  return (
    <Show
      when={selected()}
      fallback={<MutedEmptyState message={c().emptyLabel} />}
    >
      {(item) => (
        <FillColumn>
          <TightStack>
            <TopSpreadRow class={c().titleSize === "lg" ? "sui-configured-detail__title sui-configured-detail__title--lg" : "sui-configured-detail__title"}>
              <Show
                when={editKey(
                  props.kit.state.view.selectedId,
                  props.kit.ui.editing(),
                )}
                keyed
              >
                <EditableTitle
                  autoEdit={props.kit.ui.editing()}
                  title={String(item()[c().titleField])}
                  onChange={(v) =>
                    props.kit.actions.update(item().id, {
                      [c().titleField]: v,
                    } as Partial<T>)
                  }
                  onDraft={(v) =>
                    props.kit.actions.update(item().id, {
                      [c().titleField]: v,
                    } as Partial<T>)
                  }
                />
              </Show>
              <Show when={c().subtitle?.(item())}>{(s) => <span class="sui-configured-detail__subtitle">{s()}</span>}</Show>
              <Show when={c().chip?.(item())}>{(chip) => <TagPill tag={{ label: chip() }} />}</Show>
            </TopSpreadRow>
            <Show when={c().summary?.(item())}>
              {(s) => (
                <TightClusterRow class={`sui-configured-detail__summary${s().variant ? ` sui-configured-detail__summary--${s().variant}` : ""}`}>
                  <Show when={s().icon}>{(i) => <Icon name={i()} size="sm" />}</Show>
                  <span>{s().text}</span>
                </TightClusterRow>
              )}
            </Show>
            <For each={c().facts ?? []}>
              {(f) => (
                <CaptionLabel>{`${f.label}: ${f.of(item())}`}</CaptionLabel>
              )}
            </For>
            <Show when={!onActiveNode() && !onToolbar()}>{actionButton()}</Show>
          </TightStack>
          <Show when={onToolbar()}>{toolbar(item())}</Show>
          <For each={c().sections}>
            {(s, i) => (
              <Section
                section={s}
                item={item()}
                action={onActiveNode() && i() === firstFlow() ? actionButton() : undefined}
              />
            )}
          </For>
        </FillColumn>
      )}
    </Show>
  );
}

export interface ConfiguredLogProps<T extends ListItem> {
  kit: ConfiguredKit<T>;
  config: SideConfig<T>;
}

/** The right panel: the time + text log of the selected item, drawn from a SideConfig. */
export function ConfiguredLog<T extends ListItem>(
  props: ConfiguredLogProps<T>,
) {
  const c = () => props.config;
  const rows = () => {
    const item = selectedOf(props.kit);
    return item ? c().rowsOf(item) : [];
  };
  return (
    <LogLineList
      rows={rows()}
      title={c().title}
      emptyLabel={c().emptyLabel}
      instantOf={(r) => c().at(r as never)}
      textOf={(r) => c().text(r as never)}
      wrap={c().wrap}
      variant={c().variant}
      timeFormat={c().timeFormat}
    />
  );
}
