// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// CollapsiblePanel — Composed (Depth 2)
// Owns CSS (CollapsiblePanel.css), no component imports.
// A side panel that collapses to a vertical strip with a rotated label.
// Optionally mirrors collapsed state to localStorage via persistKey.
// Extracted from dside-ui DesignView (CollapsedStrip + CollapseTab).
// ============================================
import {
  Component,
  JSX,
  Show,
  createEffect,
  createSignal,
  mergeProps,
} from "solid-js";
import "./CollapsiblePanel.css";

export interface CollapsiblePanelProps {
  side: "left" | "right";
  label: string;
  /** When set, mirrors the collapsed boolean to window.localStorage. */
  persistKey?: string;
  /** Initial collapsed state when no persisted value exists. Default false. */
  defaultCollapsed?: boolean;
  /** Extra class for the outer <aside>. */
  class?: string;
  children?: JSX.Element;
}

function readPersisted(key: string | undefined, fallback: boolean): boolean {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "1" || raw === "true";
  } catch {
    return fallback;
  }
}

export const CollapsiblePanel: Component<CollapsiblePanelProps> = (props) => {
  const merged = mergeProps({ defaultCollapsed: false }, props);
  const [collapsed, setCollapsed] = createSignal(
    readPersisted(merged.persistKey, merged.defaultCollapsed),
  );

  createEffect(() => {
    const key = merged.persistKey;
    if (!key || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, collapsed() ? "1" : "0");
    } catch {
      // ignore
    }
  });

  const expandedClass = () => {
    const c = ["sui-collapsible-panel", `sui-collapsible-panel--${merged.side}`];
    if (merged.class) c.push(merged.class);
    return c.join(" ");
  };

  const stripClass = () =>
    [
      "sui-collapsible-panel__strip",
      `sui-collapsible-panel__strip--${merged.side}`,
    ].join(" ");

  return (
    <Show
      when={!collapsed()}
      fallback={
        <button
          type="button"
          class={stripClass()}
          title={`Expand ${merged.label}`}
          onClick={() => setCollapsed(false)}
        >
          <span class="sui-collapsible-panel__strip-chevron">
            {merged.side === "left" ? "›" : "‹"}
          </span>
          <span class="sui-collapsible-panel__strip-label">{merged.label}</span>
        </button>
      }
    >
      <aside class={expandedClass()}>
        <button
          type="button"
          class="sui-collapsible-panel__tab"
          title="Collapse panel"
          onClick={() => setCollapsed(true)}
        >
          {merged.side === "left" ? "‹" : "›"}
        </button>
        <div class="sui-collapsible-panel__body">{merged.children}</div>
      </aside>
    </Show>
  );
};

export function createCollapsiblePanel(
  defaults: Partial<CollapsiblePanelProps>,
): Component<CollapsiblePanelProps> {
  return (props) => <CollapsiblePanel {...mergeProps(defaults, props)} />;
}
