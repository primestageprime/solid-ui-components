// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// CollapsiblePanel — Composed (Depth 2)
// Owns CSS (CollapsiblePanel.css), no component imports.
// A side panel that collapses to a vertical strip with a rotated label.
// Optionally mirrors collapsed state to localStorage via persistKey.
// Uncontrolled by default; pass `open` (+ `onToggle`) to drive it from outside,
// e.g. a hotkey. Controlled, the caller owns the state and persistKey is ignored.
// Extracted from dside-ui DesignView (CollapsedStrip + CollapseTab).
// ============================================
import {
  type Component,
  type JSX,
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
  /**
   * Controlled mode: when defined, the panel is expanded exactly while this is
   * true and the caller owns the state (a click only asks via `onToggle`).
   * `persistKey` and `defaultCollapsed` are ignored. Leave undefined for the
   * uncontrolled panel, which is the default and behaves as before.
   */
  open?: boolean;
  /**
   * Called with the NEXT open state when the user presses the tab or the strip.
   * Fires in both modes; controlled, it is the only way the click is heard.
   */
  onToggle?: (open: boolean) => void;
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

/** Whether the caller drives the panel (`open` is defined). Pure so a test can print it. */
export const isControlled = (open: boolean | undefined): boolean =>
  open !== undefined;

export const CollapsiblePanel: Component<CollapsiblePanelProps> = (props) => {
  const merged = mergeProps({ defaultCollapsed: false }, props);
  const [innerCollapsed, setInnerCollapsed] = createSignal(
    readPersisted(merged.persistKey, merged.defaultCollapsed),
  );
  const controlled = () => isControlled(merged.open);
  const collapsed = () => (controlled() ? !merged.open : innerCollapsed());
  // Ask for a state: an uncontrolled panel moves itself, a controlled one only tells the caller.
  const setCollapsed = (next: boolean) => {
    if (!controlled()) setInnerCollapsed(next);
    merged.onToggle?.(!next);
  };

  createEffect(() => {
    const key = merged.persistKey;
    if (controlled() || !key || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, collapsed() ? "1" : "0");
    } catch {
      // ignore
    }
  });

  const expandedClass = () => {
    const c = [
      "sui-collapsible-panel",
      `sui-collapsible-panel--${merged.side}`,
    ];
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
