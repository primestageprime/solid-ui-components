import { type Component, createSignal } from "solid-js";
import { SidebarSelector, type SidebarSelectorItem } from "../../src/components/Selector";

interface DemoItem {
  title: string;
  description: string;
  status: string;
}

const items: SidebarSelectorItem<DemoItem>[] = [
  { id: "a", data: { title: "Primary Systems", description: "Core reactor and power grid", status: "Online" } },
  { id: "b", data: { title: "Navigation", description: "Helm and autopilot controls", status: "Standby" } },
  { id: "c", data: { title: "Communications", description: "Long-range comms array", status: "Offline" } },
  { id: "d", data: { title: "Life Support", description: "Atmosphere and gravity", status: "Online" } },
];

export const SidebarSelectorShowcase: Component = () => {
  const [selected, setSelected] = createSignal<string | undefined>("a");

  return (
    <div class="component-section">
      <h2>SidebarSelector — Primitive (Depth 0)</h2>
      <p class="text-meta">Owns CSS (SidebarSelector.css), no component imports. Sidebar card list + content area.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — System Selector</h3>
          <SidebarSelector
            items={items}
            selectedId={selected()}
            onSelect={(item) => setSelected(item.id)}
            renderCard={(data, isSelected) => (
              <div>
                <div style={{ "font-weight": isSelected ? "bold" : "normal", color: "var(--sui-accent)" }}>{data.title}</div>
                <div style={{ "font-size": "11px", color: "var(--sui-text-secondary)", "margin-top": "2px" }}>{data.status}</div>
              </div>
            )}
            renderSelection={(data) => (
              <div style={{ padding: "16px" }}>
                {data ? (
                  <>
                    <h4 style={{ color: "var(--sui-accent)", margin: "0 0 8px" }}>{data.title}</h4>
                    <p style={{ color: "var(--sui-text-secondary)", margin: 0 }}>{data.description}</p>
                    <p style={{ color: data.status === "Online" ? "var(--sui-success)" : data.status === "Offline" ? "var(--sui-danger)" : "#ffcc00", "margin-top": "8px" }}>{data.status}</p>
                  </>
                ) : (
                  <span style={{ color: "var(--sui-text-secondary)" }}>Select an item</span>
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
            <div class="depth2-atom"><div class="depth2-atom__label">renderCard / renderSelection</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout</div>
            <div class="depth2-atom"><div class="depth2-atom__label">sidebarWidth / maxHeight / height</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
