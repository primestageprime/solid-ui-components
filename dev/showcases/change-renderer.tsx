import { type Component, type JSX } from "solid-js";
import { ChangeRenderer } from "../../src/components/ChangeRenderer";
import { Stack } from "../../src/components/Layout/Stack";
import { Text } from "../../src/components/Text/Text";

const StatusPill: Component<{ label: string; color: string }> = (props) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      "border-radius": "10px",
      "background-color": props.color,
      color: "var(--sui-text-primary)",
      "font-size": "0.75rem",
      "font-weight": 600,
    }}
  >
    {props.label}
  </span>
);

const STATUS_COLORS: Record<string, string> = {
  NOMINAL: "#10b981",
  ALARM: "var(--sui-danger)",
  WARNING: "#f59e0b",
  OFFLINE: "#6b7280",
};

const statusAwareDispatch = (v: unknown): JSX.Element | undefined =>
  typeof v === "string" && v in STATUS_COLORS
    ? <StatusPill label={v} color={STATUS_COLORS[v]} />
    : undefined;

export const ChangeRendererShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ChangeRenderer — Depth 2 (Composite)</h2>
      <p class="text-meta">
        Composes <code>ValueRenderer</code> for the before/after sides, with a
        directional arrow between them. Both sides share the same{" "}
        <code>renderValue</code> override, so domain dispatch stays consistent
        across the pair.
      </p>

      <div class="example-group">
        <h3>Primitive changes</h3>
        <Stack gap="sm">
          <ChangeRenderer label="Count" before={12} after={15} />
          <ChangeRenderer label="Temperature" before={45.2} after={47.8} />
          <ChangeRenderer label="Name" before="Engine A" after="Engine B" />
          <ChangeRenderer label="Active" before={true} after={false} />
          <ChangeRenderer label="Was missing" before={null} after="present" />
          <ChangeRenderer label="Now missing" before="present" after={null} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Object changes</h3>
        <Text variant="sublabel">
          Each side renders through <code>ValueRenderer</code>'s default
          key/value entry list. Per-key aligned diff (added / removed /
          changed / unchanged highlighting) is NOT shown — that's a domain
          concern. Callers needing per-key diff build it on top via a{" "}
          <code>renderValue</code> override or a wrapping component.
        </Text>
        <Stack gap="sm">
          <ChangeRenderer
            label="Context"
            before={{ temperature: 45, active: true }}
            after={{ temperature: 50, active: true }}
          />
          <ChangeRenderer
            label="Config"
            before={{ threshold: 100, mode: "auto" }}
            after={{ threshold: 150, mode: "manual", alarm: true }}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Custom dispatch (shared)</h3>
        <Text variant="sublabel">
          A single <code>renderValue</code> override applies to both sides so
          domain-specific types (here, a status pill) stay consistent.
        </Text>
        <Stack gap="sm">
          <ChangeRenderer
            label="Status"
            before="NOMINAL"
            after="ALARM"
            renderValue={statusAwareDispatch}
          />
          <ChangeRenderer
            label="Status"
            before="WARNING"
            after="OFFLINE"
            renderValue={statusAwareDispatch}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>No label</h3>
        <Text variant="sublabel">
          With <code>label</code> omitted, only the pair renders — useful when
          the ChangeRenderer sits inside another layout that already labels it.
        </Text>
        <Stack gap="sm">
          <ChangeRenderer before="alpha" after="beta" />
          <ChangeRenderer before={100} after={105.5} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Custom arrow</h3>
        <Stack gap="sm">
          <ChangeRenderer label="Transition" before="draft" after="published" arrow={"\u21D2"} />
          <ChangeRenderer label="Flow" before={1} after={2} arrow={"\u2794"} />
        </Stack>
      </div>
    </div>
  );
};
