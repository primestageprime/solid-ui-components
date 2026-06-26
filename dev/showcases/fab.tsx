import { createSignal, Component } from "solid-js";
import { Fab } from "../../src/components/Fab";
import { AddFab } from "../../src/components/Fab";

export const FabShowcase: Component = () => {
  const [count, setCount] = createSignal(0);

  return (
    <div class="component-section">
      <h2>Fab — Composite (Depth 1)</h2>
      <p class="text-meta">
        Composes Button + Icon (both Depth-0 primitives). Owns a minimal structural
        CSS file (circle / fixed 56px / elevation) — a deliberate exception to
        "Depth 2 = zero CSS" because the float/circle/size geometry is structural
        and not expressible as a Button variant. Placement is always the
        container's responsibility.
      </p>

      <div class="example-group">
        <h3>Base Fab — default and disabled</h3>
        <p class="text-meta">
          Default color from Button's default variant. On hover the icon adopts
          the accent color for free (no extra CSS needed).
        </p>
        <div class="example-row" style={{ "align-items": "center", gap: "24px" }}>
          <Fab icon="plus" label="Add item" onClick={() => {}} />
          <Fab icon="plus" label="Add item (disabled)" disabled />
        </div>
        <div class="text-meta">Left: default state. Right: disabled state.</div>
      </div>

      <div class="example-group">
        <h3>AddFab curried variant — drop-in with callback</h3>
        <p class="text-meta">
          <code>AddFab = createFab(&#123; icon: "plus" &#125;)</code> — icon is baked in at
          definition time. Call site passes only data + events: no presentational
          props permitted by the type. Counter below increments on each click to
          prove the callback wires through.
        </p>
        <div class="example-row" style={{ "align-items": "center", gap: "24px" }}>
          <AddFab label="Add item" onClick={() => setCount((n) => n + 1)} />
          <span class="text-meta">Click count: {count()}</span>
        </div>
        <div class="text-meta">
          Call site: <code>&lt;AddFab label="Add item" onClick=&#123;handleAdd&#125; /&gt;</code>
        </div>
      </div>

      <div class="example-group">
        <h3>Bounded-corner placement</h3>
        <p class="text-meta">
          Placement (position, offset, corner) is always the container's
          responsibility. The Fab itself is placement-agnostic. Below: a
          320×200 box places <code>AddFab</code> at its bottom-right corner
          via a positioned wrapper div.
        </p>
        <div
          style={{
            position: "relative",
            width: "320px",
            height: "200px",
            border: "1px solid var(--sui-border)",
            "border-radius": "4px",
            background: "var(--sui-bg-secondary)",
          }}
        >
          <span
            class="text-meta"
            style={{ position: "absolute", top: "12px", left: "12px" }}
          >
            Container (320 × 200)
          </span>
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              right: "16px",
            }}
          >
            <AddFab label="Add item" onClick={() => {}} />
          </div>
        </div>
        <div class="text-meta">
          The outer <code>div</code> sets <code>position: relative</code>; an
          inner positioned <code>div</code> at <code>bottom/right</code> anchors
          the FAB. The Fab component has no placement knowledge.
        </div>
      </div>
    </div>
  );
};
