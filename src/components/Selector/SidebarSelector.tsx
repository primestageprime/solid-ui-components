// ============================================
// SidebarSelector — Atomic (Depth 1)
// Owns CSS (SidebarSelector.css), no component imports.
// Sidebar card list + selection content area.
// ============================================
import { Component, JSX, For, Show, splitProps, createSignal } from "solid-js";
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
  /** Optional width for the sidebar */
  sidebarWidth?: string;
  /** Optional max height for the sidebar scroll area */
  maxHeight?: string;
  /** Optional fixed height for the entire layout (sidebar + selection fill this) */
  height?: string;
  /** Optional class for the container */
  class?: string;
  /** Label for the selector */
  label?: string;
}

export function SidebarSelector<T>(props: SidebarSelectorProps<T>): JSX.Element {
  const selectedItem = () => props.items.find((item) => item.id === props.selectedId);

  const containerClass = () => {
    const classes = ["sidebar-selector"];
    if (props.class) classes.push(props.class);
    return classes.join(" ");
  };

  return (
    <div class={containerClass()}>
      <Show when={props.label}>
        <div class="sidebar-selector__label">{props.label}</div>
      </Show>
      <div
        class="sidebar-selector__layout"
        style={props.height ? { height: props.height } : undefined}
      >
        {/* Sidebar with cards */}
        <div
          class="sidebar-selector__sidebar"
          style={{
            width: props.sidebarWidth || "280px",
            ...(props.maxHeight ? { "max-height": props.maxHeight } : {}),
          }}
        >
          <div class="sidebar-selector__list">
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
          </div>
        </div>

        {/* Selection display */}
        <div class="sidebar-selector__selection">
          {props.renderSelection(selectedItem()?.data)}
        </div>
      </div>
    </div>
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
    <div class="episode-card">
      <div class="episode-card__header">
        <span class="episode-card__number">
          S{props.episode.season}E{props.episode.episode}
        </span>
        <span
          class="episode-card__character"
          style={{ color: props.episode.characterColor || "var(--hud-accent)" }}
        >
          {props.episode.primaryCharacter}
        </span>
      </div>
      <div class="episode-card__title">{props.episode.title}</div>
    </div>
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
          <div class="episode-selection__empty">
            Select an episode from the sidebar
          </div>
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
            <div class="episode-selection__meta">
              <span
                class="episode-selection__character"
                style={{ color: ep().characterColor || "var(--hud-accent)" }}
              >
                Focus: {ep().primaryCharacter}
              </span>
              <Show when={ep().airDate}>
                <span class="episode-selection__date">{ep().airDate}</span>
              </Show>
            </div>
            <Show when={ep().synopsis}>
              <p class="episode-selection__synopsis">{ep().synopsis}</p>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
};

// ============================================
// Demo Data & Component
// ============================================

const AVATAR_EPISODES: SidebarSelectorItem<EpisodeCardData>[] = [
  {
    id: "s1e1",
    data: {
      title: "The Boy in the Iceberg",
      season: 1,
      episode: 1,
      primaryCharacter: "Aang",
      characterColor: "#ffcc00",
      airDate: "Feb 21, 2005",
      synopsis:
        "Katara and Sokka discover Aang, the long-lost Avatar, frozen in an iceberg.",
    },
  },
  {
    id: "s1e3",
    data: {
      title: "The Southern Air Temple",
      season: 1,
      episode: 3,
      primaryCharacter: "Aang",
      characterColor: "#ffcc00",
      airDate: "Feb 25, 2005",
      synopsis:
        "Aang returns to his childhood home and learns the fate of his people.",
    },
  },
  {
    id: "s1e12",
    data: {
      title: "The Storm",
      season: 1,
      episode: 12,
      primaryCharacter: "Zuko",
      characterColor: "#ff4444",
      airDate: "Jun 3, 2005",
      synopsis:
        "The pasts of both Aang and Zuko are revealed through flashbacks.",
    },
  },
  {
    id: "s2e6",
    data: {
      title: "The Blind Bandit",
      season: 2,
      episode: 6,
      primaryCharacter: "Toph",
      characterColor: "#44cc44",
      airDate: "May 5, 2006",
      synopsis:
        "The gang searches for an earthbending teacher and discovers Toph.",
    },
  },
  {
    id: "s2e15",
    data: {
      title: "Tales of Ba Sing Se",
      season: 2,
      episode: 15,
      primaryCharacter: "Iroh",
      characterColor: "#ff8844",
      airDate: "Sep 29, 2006",
      synopsis:
        "A collection of short stories featuring each member of the group.",
    },
  },
  {
    id: "s3e21",
    data: {
      title: "Sozin's Comet: Avatar Aang",
      season: 3,
      episode: 21,
      primaryCharacter: "Aang",
      characterColor: "#ffcc00",
      airDate: "Jul 19, 2008",
      synopsis:
        "The final battle. Aang faces Fire Lord Ozai to end the war.",
    },
  },
];

export function SidebarSelectorDemo(): JSX.Element {
  const [selectedId, setSelectedId] = createSignal<string | undefined>("s1e1");

  const handleSelect = (item: SidebarSelectorItem<EpisodeCardData>) => {
    setSelectedId(item.id);
  };

  return (
    <div style={{ padding: "20px", background: "var(--hud-bg-deep, #030810)" }}>
      <h3
        style={{
          color: "var(--hud-accent, #00d4ff)",
          "margin-bottom": "16px",
          "font-size": "14px",
          "text-transform": "uppercase",
          "letter-spacing": "0.1em",
        }}
      >
        Episode Selector
      </h3>
      <SidebarSelector
        items={AVATAR_EPISODES}
        selectedId={selectedId()}
        onSelect={handleSelect}
        renderCard={(ep, isSelected) => (
          <EpisodeCard episode={ep} isSelected={isSelected} />
        )}
        renderSelection={(ep) => <EpisodeSelection episode={ep} />}
        maxHeight="320px"
      />
    </div>
  );
}

