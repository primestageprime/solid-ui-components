// ConfiguredViews (Depth 2, composes StatusCard / StatusCell / EditableTitle / SectionTable / HotkeyButton /
// LogLineList). The three panels of a list-and-detail app drawn from plain-data configs (see
// listDetail/views.ts) and a defineListDetail kit: the card in the rail, the centre panel for the selected
// item, and the right-hand log. The app writes the config; the structure is here. No app nouns.
import { For, type JSX, Show } from "solid-js";
import { find, findIndex, map } from "../../fn";
import { editKey } from "../../listDetail/focus";
import type { ListItem } from "../../listDetail/listkit";
import type {
  CardConfig,
  DetailConfig,
  DetailSection,
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
import { FillColumn, TightStack, TopSpreadRow } from "../Layout/variants";
import { LogLineList } from "../LogLineList/LogLineList";
import { HatchedProgressBar } from "../Progress/HatchedProgressBar";
import { SequenceFlow, type SequenceNode } from "../SequenceFlow/SequenceFlow";
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
          aside={c().who?.(props.item)}
          bar={
            <Show when={underway() ? progress() : undefined}>
              {(p) => <HatchedProgressBar done={p().done} active={p().active} total={p().total} label={c().title(props.item)} />}
            </Show>
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

/** The rows of a flow section as SequenceFlow nodes and edge labels. */
export const flowNodesOf = <T,>(
  section: FlowSection<T, object>,
  item: T,
): { nodes: SequenceNode[]; edgeLabels: (string | undefined)[] } => {
  const rows = section.rowsOf(item);
  const nodes = map((r: object) => ({ ...section.nodeOf(r, item), id: (r as { id: string }).id }), rows);
  const edgeLabels = map(
    (r: object, i: number) => (i < rows.length - 1 ? section.edgeLabelOf?.(r, rows[i + 1], item) : undefined),
    rows,
  );
  return { nodes, edgeLabels };
};

function FlowSectionView<T>(props: { section: FlowSection<T, object>; item: T; action?: JSX.Element }) {
  const s = () => props.section;
  const flow = () => flowNodesOf(s(), props.item);
  return (
    <TightStack>
      <Show when={s().title}>
        <SectionTitle>{s().title}</SectionTitle>
      </Show>
      <SequenceFlow
        nodes={flow().nodes}
        edgeLabels={flow().edgeLabels}
        selectedId={s().selectedOf?.(props.item)}
        onSelect={(id) => s().onSelect?.(props.item, id)}
        estimateLabel={s().estimateLabel}
        actualLabel={s().actualLabel}
        emptyLabel={s().emptyLabel}
        action={props.action}
      />
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
  const firstFlow = () => findIndex((s: DetailSection<T>) => s.kind === "flow", c().sections);
  const actionButton = () => (
    <Show when={c().action}>
      {(a) => (
        <HotkeyButton
          hotkey={a().hotkey}
          icon={a().icon}
          armed={false}
          casing={onActiveNode() ? "normal" : undefined}
          onTrigger={() => props.kit.actions.primary()}
        >
          {a().label}
        </HotkeyButton>
      )}
    </Show>
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
                />
              </Show>
              <Show when={c().chip?.(item())}>{(chip) => <TagPill tag={{ label: chip() }} />}</Show>
            </TopSpreadRow>
            <For each={c().facts ?? []}>
              {(f) => (
                <CaptionLabel>{`${f.label}: ${f.of(item())}`}</CaptionLabel>
              )}
            </For>
            <Show when={!onActiveNode()}>{actionButton()}</Show>
          </TightStack>
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
