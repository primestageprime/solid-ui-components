import { For, Component } from "solid-js";
import { Icon, IconName, ICON_GROUPS } from "../../src/components/Icon";

export const IconShowcase: Component = () => {
  const groupLabels: Record<keyof typeof ICON_GROUPS, string> = {
    status: "Status",
    navigation: "Navigation",
    data: "Data & Charts",
    time: "Time",
    actions: "Actions",
    ui: "UI",
  };

  return (
    <div class="component-section">
      <h2>Icon — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (Icon.css), no component imports. SVG icon set with outline/solid variants, 5 sizes.</p>

      <For each={Object.entries(ICON_GROUPS) as [keyof typeof ICON_GROUPS, readonly IconName[]][]}>
        {([groupKey, icons]) => (
          <div class="example-group">
            <h3>{groupLabels[groupKey]}</h3>
            <div class="example-row" style={{ gap: "16px", "flex-wrap": "wrap" }}>
              <For each={icons as IconName[]}>
                {(name) => (
                  <div class="icon-item">
                    <Icon name={name} size="lg" />
                    <span class="icon-label">{name}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </For>

      <div class="example-group">
        <h3>Sizes</h3>
        <div class="example-row" style={{ "align-items": "center", gap: "16px" }}>
          <div class="icon-item"><Icon name="check" size="xs" /><span class="icon-label">xs</span></div>
          <div class="icon-item"><Icon name="check" size="sm" /><span class="icon-label">sm</span></div>
          <div class="icon-item"><Icon name="check" size="md" /><span class="icon-label">md</span></div>
          <div class="icon-item"><Icon name="check" size="lg" /><span class="icon-label">lg</span></div>
          <div class="icon-item"><Icon name="check" size="xl" /><span class="icon-label">xl</span></div>
        </div>
      </div>

      <div class="example-group">
        <h3>Spinner Animation</h3>
        <div class="example-row" style={{ "align-items": "center", gap: "16px" }}>
          <Icon name="spinner" size="sm" />
          <Icon name="spinner" size="md" />
          <Icon name="spinner" size="lg" />
          <Icon name="spinner" size="xl" />
        </div>
      </div>
    </div>
  );
};
