import { Component, createSignal } from "solid-js";
import { Tabs } from "../../src/components/Tabs";

export const TabsShowcase: Component = () => {
  const [active, setActive] = createSignal("overview");
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "systems", label: "Systems" },
    { id: "navigation", label: "Nav" },
    { id: "comms", label: "Comms" },
  ];

  return (
    <div class="component-section">
      <h2>Tabs — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Tab bar with variant styles.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Default (Underline)</h3>
          <Tabs tabs={tabs} activeTab={active()} onTabChange={setActive} />

          <h3 style={{ "margin-top": "24px" }}>Composed — Boxed</h3>
          <Tabs tabs={tabs} activeTab={active()} onTabChange={setActive} variant="boxed" />

          <h3 style={{ "margin-top": "24px" }}>Composed — Pill</h3>
          <Tabs tabs={tabs} activeTab={active()} onTabChange={setActive} variant="pill" />

          <h3 style={{ "margin-top": "24px" }}>Composed — With Status</h3>
          <Tabs
            tabs={[
              { id: "a", label: "Clean" },
              { id: "b", label: "Warning", status: "warning" },
              { id: "c", label: "Error", status: "error" },
            ]}
            activeTab="a"
            onTabChange={() => {}}
          />
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom"><div class="depth2-atom__label">default / underline / boxed / pill</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Color</div>
            <div class="depth2-atom"><div class="depth2-atom__label">default / primary / danger / warning / success</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Tab Status</div>
            <div class="depth2-atom"><div class="depth2-atom__label">warning / error</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
