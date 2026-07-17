import { type Component, createSignal } from "solid-js";
import {
  SidebarSelector,
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

export const SidebarSelectorShowcase: Component = () => {
  const [selected, setSelected] = createSignal<string | undefined>("a");

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
            maxHeight="250px"
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
    </div>
  );
};
