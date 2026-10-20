// ConfiguredViews (Depth 2, composes StatusCard / StatusCell / EditableTitle / SectionTable / HotkeyButton /
// Tags: shows:card, shows:log, shows:status, does:view, data:scalar, data:list, role:panel
// LogLineList). The three panels of a list-and-detail app drawn from plain-data configs (see
// listDetail/views.ts) and a defineListDetail kit: the card in the rail, the centre panel for the selected
// item, and the right-hand log. The app writes the config; the structure is here. No app nouns.
import { For, Show } from "solid-js";
import { find } from "../../fn";
import { editKey } from "../../listDetail/focus";
import type { ListItem } from "../../listDetail/listkit";
import type {
  CardConfig,
  DetailConfig,
  DetailSection,
  SideConfig,
} from "../../listDetail/views";
import { StatusCard } from "../Card/StatusCard";
import { EditableTitle } from "../EditableTitle/EditableTitle";
import { MutedEmptyState } from "../Feedback/variants";
import { HotkeyButton } from "../HotkeyButton/HotkeyButton";
import { FillColumn, TightStack } from "../Layout/variants";
import { LogLineList } from "../LogLineList/LogLineList";
import { SectionTable } from "../Table/SectionTable";
import { StatusCell } from "../Table/statusCells";
import { CaptionLabel } from "../Text/variants";

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

/** One item in the rail, drawn from a CardConfig. */
export function ConfiguredCard<T>(props: ConfiguredCardProps<T>) {
  const c = () => props.config;
  return (
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
  );
}

export interface ConfiguredDetailProps<T extends ListItem> {
  kit: ConfiguredKit<T>;
  config: DetailConfig<T>;
}

function Section<T>(props: { section: DetailSection<T>; item: T }) {
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

/** The centre panel for the selected item, drawn from a DetailConfig. */
export function ConfiguredDetail<T extends ListItem>(
  props: ConfiguredDetailProps<T>,
) {
  const c = () => props.config;
  const selected = (): T | undefined => selectedOf(props.kit);
  return (
    <Show
      when={selected()}
      fallback={<MutedEmptyState message={c().emptyLabel} />}
    >
      {(item) => (
        <FillColumn>
          <TightStack>
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
            <For each={c().facts ?? []}>
              {(f) => (
                <CaptionLabel>{`${f.label}: ${f.of(item())}`}</CaptionLabel>
              )}
            </For>
            <Show when={c().action}>
              {(a) => (
                <HotkeyButton
                  hotkey={a().hotkey}
                  icon={a().icon}
                  armed={false}
                  onTrigger={() => props.kit.actions.primary()}
                >
                  {a().label}
                </HotkeyButton>
              )}
            </Show>
          </TightStack>
          <For each={c().sections}>
            {(s) => <Section section={s} item={item()} />}
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
    />
  );
}
