import { type Component, createSignal } from "solid-js";
import { createTabs } from "../../src/components/Tabs";
import { BoxedTabs, PillTabs, Tabs } from "../../src/components/Tabs/variants";

// Local prop-matrix instances — this showcase demonstrates the orientation
// axis, which no shipped variant bakes. Factory-curried at module top so the
// visual config still lives in one place, not at the call site.
const VerticalTabs = createTabs({ orientation: "vertical" });
const VerticalBoxedTabs = createTabs({
  orientation: "vertical",
  variant: "boxed",
});

export const TabsShowcase: Component = () => {
  const [active, setActive] = createSignal("overview");
  // Eight settings-style tabs: enough to fold in a narrow strip. The active
  // tab always stays in view; the rest keep their order in the kebab.
  const [settingsActive, setSettingsActive] = createSignal("team");
  const settingsTabs = [
    { id: "forecast", label: "Forecast" },
    { id: "accounts", label: "Accounts" },
    { id: "scenarios", label: "Scenarios" },
    { id: "integrations", label: "Integrations" },
    { id: "team", label: "Team" },
    { id: "pages", label: "Pages" },
    { id: "display", label: "Display" },
    { id: "admin", label: "Admin" },
  ];
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "systems", label: "Systems" },
    { id: "navigation", label: "Nav" },
    { id: "comms", label: "Comms" },
  ];

  return (
    <div class="component-section">
      <h2>Tabs — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS. Tab bar with variant styles; horizontal strips fold the tabs
        that don't fit into a kebab menu.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Default (Underline)</h3>
          <Tabs tabs={tabs} activeTab={active()} onTabChange={setActive} />

          <h3 class="showcase-heading-gap">Composed — Boxed</h3>
          <BoxedTabs tabs={tabs} activeTab={active()} onTabChange={setActive} />

          <h3 class="showcase-heading-gap">Composed — Pill</h3>
          <PillTabs tabs={tabs} activeTab={active()} onTabChange={setActive} />

          <h3 class="showcase-heading-gap">
            Composed — Responsive (drag the corner to narrow it)
          </h3>
          <div class="hud-tabs-demo__resizable">
            <Tabs
              tabs={settingsTabs}
              activeTab={settingsActive()}
              onTabChange={setSettingsActive}
            />
          </div>

          <h3 class="showcase-heading-gap">Composed — With Status</h3>
          <Tabs
            tabs={[
              { id: "a", label: "Clean" },
              { id: "b", label: "Warning", status: "warning" },
              { id: "c", label: "Error", status: "error" },
            ]}
            activeTab="a"
            onTabChange={() => {}}
          />

          <h3 class="showcase-heading-gap">
            Composed — Vertical (Default)
          </h3>
          <div class="hud-tabs-demo__row">
            <VerticalTabs
              tabs={tabs}
              activeTab={active()}
              onTabChange={setActive}
            />
            <div class="hud-tabs-demo__pane">
              Active tab: <strong>{active()}</strong>
            </div>
          </div>

          <h3 class="showcase-heading-gap">Composed — Vertical (Boxed)</h3>
          <div class="hud-tabs-demo__row">
            <VerticalBoxedTabs
              tabs={tabs}
              activeTab={active()}
              onTabChange={setActive}
            />
            <div class="hud-tabs-demo__pane">
              Active tab: <strong>{active()}</strong>
            </div>
          </div>
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                default / underline / boxed / pill
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Orientation</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                horizontal (default) / vertical
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Color</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                default / primary / danger / warning / success
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Tab Status</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">warning / error</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
