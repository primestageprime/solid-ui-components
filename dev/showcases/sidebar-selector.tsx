import { type Component, createSignal } from "solid-js";
import {
  SidebarSelector,
  EpisodeCard,
  EpisodeSelection,
  type EpisodeCardData,
  type SidebarSelectorItem,
} from "../../src/components/Selector";
import { TextBody } from "../../src/components/Text";

interface DemoItem {
  title: string;
  description: string;
  status: string;
}

const items: SidebarSelectorItem<DemoItem>[] = [
  {
    id: "a",
    data: {
      title: "Primary Systems",
      description: "Core reactor and power grid",
      status: "Online",
    },
  },
  {
    id: "b",
    data: {
      title: "Navigation",
      description: "Helm and autopilot controls",
      status: "Standby",
    },
  },
  {
    id: "c",
    data: {
      title: "Communications",
      description: "Long-range comms array",
      status: "Offline",
    },
  },
  {
    id: "d",
    data: {
      title: "Life Support",
      description: "Atmosphere and gravity",
      status: "Online",
    },
  },
];

// A season's worth of episodes for the EpisodeCard / EpisodeSelection pair —
// enough rows that the sidebar scrolls and the focus colours repeat, which is
// what those two renderers were shaped for.
const EPISODES: SidebarSelectorItem<EpisodeCardData>[] = [
  {
    id: "e1",
    data: {
      title: "Cold Open",
      season: 1,
      episode: 1,
      primaryCharacter: "Renner",
      characterColor: "var(--sui-accent)",
      airDate: "Mar 3, 2026",
      synopsis:
        "A night shift at the harbour office ends with a container that nobody logged.",
    },
  },
  {
    id: "e2",
    data: {
      title: "Manifest",
      season: 1,
      episode: 2,
      primaryCharacter: "Okonjo",
      characterColor: "var(--sui-success)",
      airDate: "Mar 10, 2026",
      synopsis:
        "Two manifests disagree by one line. Okonjo starts pulling on it and the berth schedule unravels.",
    },
  },
  {
    id: "e3",
    data: {
      title: "Deadweight",
      season: 1,
      episode: 3,
      primaryCharacter: "Renner",
      characterColor: "var(--sui-accent)",
      airDate: "Mar 17, 2026",
      synopsis:
        "The tanker rides too high in the water and the crane crew notices before the paperwork does.",
    },
  },
  {
    id: "e4",
    data: {
      title: "Demurrage",
      season: 1,
      episode: 4,
      primaryCharacter: "Vance",
      characterColor: "var(--sui-warning)",
      airDate: "Mar 24, 2026",
      synopsis:
        "Every hour alongside costs someone money, and Vance has to decide whose.",
    },
  },
  {
    id: "e5",
    data: {
      title: "Slack Water",
      season: 1,
      episode: 5,
      primaryCharacter: "Okonjo",
      characterColor: "var(--sui-success)",
      airDate: "Mar 31, 2026",
      synopsis:
        "A tide window closes. The only berth left belongs to a ship that hasn't arrived.",
    },
  },
  {
    id: "e6",
    data: {
      title: "Bill of Lading",
      season: 1,
      episode: 6,
      primaryCharacter: "Vance",
      characterColor: "var(--sui-danger)",
      airDate: "Apr 7, 2026",
      synopsis:
        "The season ends where it opened: one unlogged container, and a signature that shouldn't exist.",
    },
  },
];

export const SidebarSelectorShowcase: Component = () => {
  const [selected, setSelected] = createSignal<string | undefined>("a");
  const [episode, setEpisode] = createSignal<string | undefined>("e2");

  return (
    <div class="component-section">
      <h2>SidebarSelector — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (SidebarSelector.css), no component imports. Sidebar card list
        + content area.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — System Selector</h3>
          <SidebarSelector
            items={items}
            selectedId={selected()}
            onSelect={(item) => setSelected(item.id)}
            renderCard={(data, isSelected) => (
              <div>
                <div
                  class="sidebar-selector-demo__card-title"
                  classList={{
                    "sidebar-selector-demo__card-title--selected": isSelected,
                  }}
                >
                  {data.title}
                </div>
                <div class="sidebar-selector-demo__card-status">
                  {data.status}
                </div>
              </div>
            )}
            renderSelection={(data) => (
              <div class="sidebar-selector-demo__selection">
                {data ? (
                  <>
                    <h4 class="sidebar-selector-demo__sel-title">
                      {data.title}
                    </h4>
                    <TextBody>{data.description}</TextBody>
                    <p
                      class="sidebar-selector-demo__sel-status"
                      classList={{
                        "sidebar-selector-demo__sel-status--online":
                          data.status === "Online",
                        "sidebar-selector-demo__sel-status--offline":
                          data.status === "Offline",
                        "sidebar-selector-demo__sel-status--other":
                          data.status !== "Online" && data.status !== "Offline",
                      }}
                    >
                      {data.status}
                    </p>
                  </>
                ) : (
                  <span class="sidebar-selector-demo__empty">
                    Select an item
                  </span>
                )}
              </div>
            )}
            height="250px"
            label="Ship Systems"
          />
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Render Slots</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">renderCard / renderSelection</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">height</div>
            </div>
          </div>
        </div>
      </div>

      <h3>EpisodeCard + EpisodeSelection — the packaged renderer pair</h3>
      <p class="text-meta">
        SidebarSelector's two render slots are just callbacks, so SUI ships one
        worked pair for the episode-browsing shape: <code>EpisodeCard</code> is
        the sidebar card (season/episode number, focus character, title) and{" "}
        <code>EpisodeSelection</code> is the detail pane (badge, title, focus,
        air date, synopsis). Neither stands alone — they are shown here in the
        parent that positions them, over a season list rather than three
        invented rows.
      </p>
      <div class="example-group">
        <SidebarSelector
          items={EPISODES}
          selectedId={episode()}
          onSelect={(item) => setEpisode(item.id)}
          renderCard={(data, isSelected) => (
            <EpisodeCard episode={data} isSelected={isSelected} />
          )}
          renderSelection={(data) => <EpisodeSelection episode={data} />}
          height="320px"
          label="Season 1"
        />
      </div>
    </div>
  );
};
