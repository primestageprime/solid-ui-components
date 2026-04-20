import { type Component, type JSX } from "solid-js";
import { ValueRenderer } from "../../src/components/ValueRenderer";
import { Stack } from "../../src/components/Layout/Stack";
import { Text } from "../../src/components/Text/Text";

// A small status-badge override used by the "custom dispatch" example. Not a
// library atomic — host code owns what a "status" is and how to render it.
const StatusPill: Component<{ label: string; color: string }> = (props) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      "border-radius": "10px",
      "background-color": props.color,
      color: "#fff",
      "font-size": "0.75rem",
      "font-weight": 600,
    }}
  >
    {props.label}
  </span>
);

const STATUS_COLORS: Record<string, string> = {
  NOMINAL: "#10b981",
  ALARM: "#ef4444",
  WARNING: "#f59e0b",
  OFFLINE: "#6b7280",
};

const isStatusString = (v: unknown): v is string =>
  typeof v === "string" && v in STATUS_COLORS;

const statusAwareDispatch = (v: unknown): JSX.Element | undefined =>
  isStatusString(v)
    ? <StatusPill label={v} color={STATUS_COLORS[v]} />
    : undefined;

export const ValueRendererShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ValueRenderer — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (ValueRenderer.css), no component imports. Meta-primitive for
        labeled label/value layout with a pluggable value dispatcher. Zero
        configuration for primitives (string/number/boolean/null) and plain
        objects. Override the dispatch via <code>renderValue</code> to inject
        domain renderers (status badges, candlesticks, etc.).
      </p>

      <div class="example-group">
        <h3>Primitives (zero-config)</h3>
        <Stack gap="sm">
          <ValueRenderer label="String" value="Hello, world" />
          <ValueRenderer label="Number" value={1234.5678} />
          <ValueRenderer label="Precision override" value={1234.5678} numberPrecision={4} />
          <ValueRenderer label="Boolean true" value={true} />
          <ValueRenderer label="Boolean false" value={false} />
          <ValueRenderer label="Null" value={null} />
          <ValueRenderer label="Undefined" value={undefined} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Arrays</h3>
        <Stack gap="sm">
          <ValueRenderer
            label="Numbers"
            value={[1.1, 2.22, 3.333, 4.4444]}
          />
          <ValueRenderer
            label="Strings"
            value={["alpha", "beta", "gamma"]}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Objects (recursive dispatch)</h3>
        <Stack gap="md">
          <ValueRenderer
            label="Context"
            value={{
              temperature: 45.2,
              active: true,
              name: "Engine #3",
              missing: null,
            }}
          />
          <ValueRenderer
            label="Nested"
            value={{
              outer: "value",
              inner: {
                depth: 2,
                flags: [true, false, true],
              },
            }}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>No label (body-only render)</h3>
        <Text variant="sublabel">
          When <code>label</code> is omitted, the component renders just the
          value — useful as a drop-in for JSX slots.
        </Text>
        <Stack gap="sm">
          <ValueRenderer value="Just the value" />
          <ValueRenderer value={42} />
          <ValueRenderer value={null} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Custom dispatch (extension hook)</h3>
        <Text variant="sublabel">
          Host code supplies a <code>renderValue</code> function that returns
          custom JSX for known types and <code>undefined</code> for everything
          else — the default dispatcher takes over for the fallback cases.
        </Text>
        <Stack gap="sm">
          <ValueRenderer
            label="Status"
            value="NOMINAL"
            renderValue={statusAwareDispatch}
          />
          <ValueRenderer
            label="Status"
            value="ALARM"
            renderValue={statusAwareDispatch}
          />
          <ValueRenderer
            label="Mixed object"
            value={{ name: "Sensor A", state: "WARNING", rpm: 1423.7 }}
            renderValue={statusAwareDispatch}
          />
        </Stack>
      </div>
    </div>
  );
};
