import { type Component, Show } from "solid-js";

export interface PillStats {
  active: boolean;
  /** Items in current filtered set. */
  currentCount: number;
  /** Items in filtered set if this pill were toggled. */
  newCount: number;
  /** Items added (in newSet but not currentSet) — green +N badge top-left. */
  added: number;
  /** Items removed (in currentSet but not newSet) — red −N badge top-right. */
  removed: number;
}

export interface PillProps {
  tag: string;
  stats: PillStats;
  onToggle: () => void;
  /** Total items in the universe — used as denominator for the internal fill bar. */
  totalItems: number;
}

const shortTag = (tag: string) => tag.replace(/^depth:/, "d");

export const TagPill: Component<PillProps> = (props) => {
  const fillFraction = () => props.stats.newCount / Math.max(1, props.totalItems);
  const isActive = () => props.stats.active;

  return (
    <div
      class="sui-tag-pill"
      style={{
        position: "relative",
        display: "inline-block",
        // Reserves vertical space for the badge so it sits ABOVE the pill,
        // never overlapping pill body or border.
        padding: "16px 0 0 0",
      }}
    >
      <button
        type="button"
        onClick={props.onToggle}
        style={{
          position: "relative",
          "z-index": 1,
          display: "inline-flex",
          "align-items": "center",
          "justify-content": "center",
          padding: "5px 12px",
          background: isActive() ? "rgba(0, 168, 204, 0.18)" : "transparent",
          border: `1px solid ${isActive() ? "rgba(0, 168, 204, 0.6)" : "var(--jtf-border)"}`,
          "border-radius": "999px",
          color: "var(--jtf-text-secondary)",
          "font-family": "var(--jtf-font-family)",
          "font-size": "12px",
          "font-weight": 500,
          cursor: "pointer",
          overflow: "hidden",
          "line-height": 1.2,
          "white-space": "nowrap",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: "0",
            width: `${fillFraction() * 100}%`,
            background: isActive() ? "rgba(0, 168, 204, 0.12)" : "rgba(255, 255, 255, 0.04)",
            "border-radius": "999px 0 0 999px",
            "pointer-events": "none",
            transition: "width 0.15s ease",
          }}
        />
        <span style={{ position: "relative" }}>{shortTag(props.tag)}</span>
      </button>

      <Show when={props.stats.added > 0}>
        <span
          class="sui-tag-pill__badge"
          style={{
            position: "absolute",
            top: "0",
            left: "4px",
            "z-index": 0,
            padding: "0 5px",
            background: "#3ecf8e",
            color: "#0a1525",
            "border-radius": "999px",
            "font-size": "9px",
            "font-weight": 700,
            "font-feature-settings": '"tnum"',
            "line-height": "14px",
            "min-width": "16px",
            "text-align": "center",
          }}
        >
          +{props.stats.added}
        </span>
      </Show>

      <Show when={props.stats.removed > 0}>
        <span
          class="sui-tag-pill__badge"
          style={{
            position: "absolute",
            top: "0",
            right: "4px",
            "z-index": 0,
            padding: "0 5px",
            background: "#e57373",
            color: "#0a1525",
            "border-radius": "999px",
            "font-size": "9px",
            "font-weight": 700,
            "font-feature-settings": '"tnum"',
            "line-height": "14px",
            "min-width": "16px",
            "text-align": "center",
          }}
        >
          −{props.stats.removed}
        </span>
      </Show>
    </div>
  );
};
