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
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "systems", label: "Systems" },
    { id: "navigation", label: "Nav" },
    { id: "comms", label: "Comms" },
  ];

  return (
    <div class="component-section">
      <h2>Tabs — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (HUD.css), no component imports. Tab bar with variant styles.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Default (Underline)</h3>
          <Tabs tabs={tabs} activeTab={active()} onTabChange={setActive} />

          <h3 style={{ "margin-top": "24px" }}>Composed — Boxed</h3>
          <BoxedTabs tabs={tabs} activeTab={active()} onTabChange={setActive} />

          <h3 style={{ "margin-top": "24px" }}>Composed — Pill</h3>
          <PillTabs tabs={tabs} activeTab={active()} onTabChange={setActive} />

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

          <h3 style={{ "margin-top": "24px" }}>
            Composed — Vertical (Default)
          </h3>
          <div
            style={{
              display: "flex",
              "min-height": "180px",
              border: "1px dashed var(--sui-border)",
            }}
          >
            <VerticalTabs
              tabs={tabs}
              activeTab={active()}
              onTabChange={setActive}
            />
            <div
              style={{
                flex: 1,
                padding: "16px",
                color: "var(--sui-text-muted)",
              }}
            >
              Active tab: <strong>{active()}</strong>
            </div>
          </div>

          <h3 style={{ "margin-top": "24px" }}>Composed — Vertical (Boxed)</h3>
          <div
            style={{
              display: "flex",
              "min-height": "180px",
              border: "1px dashed var(--sui-border)",
            }}
          >
            <VerticalBoxedTabs
              tabs={tabs}
              activeTab={active()}
              onTabChange={setActive}
            />
            <div
              style={{
                flex: 1,
                padding: "16px",
                color: "var(--sui-text-muted)",
              }}
            >
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
