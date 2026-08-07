// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// SidebarSelector — Atomic (Depth 1)
// Owns CSS (SidebarSelector.css), no component imports.
// Sidebar card list + selection content area.
// ============================================
import { type Component, type JSX, For, Show } from "solid-js";
import {
  CenteredStack,
  ClipFillColumnFlush,
  ClusterRow,
  Column,
  FillColumnFlush,
  NoShrinkScrollBox,
  PaneRow,
  SpreadRow,
  TightStack,
} from "../Layout/variants";
import { find } from "../../fn";
import "./SidebarSelector.css";

export interface SidebarSelectorItem<T = unknown> {
  id: string;
  data: T;
}

export interface SidebarSelectorProps<T> {
  /** Items to display in the sidebar */
  items: SidebarSelectorItem<T>[];
  /** Currently selected item id */
  selectedId?: string;
  /** Callback when item is selected */
  onSelect: (item: SidebarSelectorItem<T>) => void;
  /** Render function for each card in the sidebar */
  renderCard: (item: T, isSelected: boolean) => JSX.Element;
  /** Render function for the selection display button */
  renderSelection: (item: T | undefined) => JSX.Element;
  /** Optional fixed height for the entire layout (sidebar + selection fill this) */
  height?: string;
  /** Optional class for the container */
  class?: string;
  /** Label for the selector */
  label?: string;
}

export function SidebarSelector<T>(
  props: SidebarSelectorProps<T>,
): JSX.Element {
  const selectedItem = () =>
    find((item) => item.id === props.selectedId, props.items);

  const containerClass = () => {
    const classes = ["sidebar-selector"];
    if (props.class) classes.push(props.class);
    return classes.join(" ");
  };

  return (
    <FillColumnFlush class={containerClass()}>
      <Show when={props.label}>
        <div class="sidebar-selector__label">{props.label}</div>
      </Show>
      <PaneRow
        class="sidebar-selector__layout"
        style={props.height ? { height: props.height } : undefined}
      >
        {/* Sidebar with cards — frozen 280px width + scroll geometry live in
            SidebarSelector.css / NoShrinkScrollBox; no inline geometry here. */}
        <NoShrinkScrollBox class="sidebar-selector__sidebar">
          <Column class="sidebar-selector__list">
            <For each={props.items}>
              {(item) => {
                const isSelected = () => item.id === props.selectedId;
                return (
                  <button
                    class={`sidebar-selector__card ${isSelected() ? "sidebar-selector__card--selected" : ""}`}
                    onClick={() => props.onSelect(item)}
                    type="button"
                  >
                    {props.renderCard(item.data, isSelected())}
                  </button>
                );
              }}
            </For>
          </Column>
        </NoShrinkScrollBox>

        {/* Selection display */}
        <ClipFillColumnFlush class="sidebar-selector__selection">
          {props.renderSelection(selectedItem()?.data)}
        </ClipFillColumnFlush>
      </PaneRow>
    </FillColumnFlush>
  );
}

// ============================================
// Episode Card Component for Avatar Demo
// ============================================

export interface EpisodeCardData {
  title: string;
  season: number;
  episode: number;
  primaryCharacter: string;
  characterColor?: string;
  synopsis?: string;
  airDate?: string;
}

export interface EpisodeCardProps {
  episode: EpisodeCardData;
  isSelected: boolean;
}

export const EpisodeCard: Component<EpisodeCardProps> = (props) => {
  return (
    <TightStack class="episode-card">
      <SpreadRow class="episode-card__header">
        <span class="episode-card__number">
          S{props.episode.season}E{props.episode.episode}
        </span>
        <span
          class="episode-card__character"
          style={{ color: props.episode.characterColor || "var(--sui-accent)" }}
        >
          {props.episode.primaryCharacter}
        </span>
      </SpreadRow>
      <div class="episode-card__title">{props.episode.title}</div>
    </TightStack>
  );
};

// ============================================
// Episode Selection Display
// ============================================

export interface EpisodeSelectionProps {
  episode: EpisodeCardData | undefined;
}

export const EpisodeSelection: Component<EpisodeSelectionProps> = (props) => {
  return (
    <div class="episode-selection">
      <Show
        when={props.episode}
        fallback={
          <CenteredStack class="episode-selection__empty">
            Select an episode from the sidebar
          </CenteredStack>
        }
      >
        {(ep) => (
          <>
            <div class="episode-selection__badge">
              <span class="episode-selection__number">
                Season {ep().season} · Episode {ep().episode}
              </span>
            </div>
            <h3 class="episode-selection__title">{ep().title}</h3>
            <ClusterRow class="episode-selection__meta">
              <span
                class="episode-selection__character"
                style={{ color: ep().characterColor || "var(--sui-accent)" }}
              >
                Focus: {ep().primaryCharacter}
              </span>
              <Show when={ep().airDate}>
                <span class="episode-selection__date">{ep().airDate}</span>
              </Show>
            </ClusterRow>
            <Show when={ep().synopsis}>
              <p class="episode-selection__synopsis">{ep().synopsis}</p>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
};
