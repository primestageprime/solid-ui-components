import { Component, For } from "solid-js";
import { ScrollRegion } from "../../src/components/ScrollRegion";

const rows = (n: number, label: string) =>
  Array.from({ length: n }, (_, i) => `${label} row ${i + 1}`);

const Box: Component<{ children: any }> = (props) => (
  <div
    style={{
      width: "260px",
      height: "200px",
      border: "1px solid var(--sui-border)",
      "border-radius": "var(--sui-radius-sm, 4px)",
      display: "flex",
      "flex-direction": "column",
      background: "var(--sui-bg-primary)",
    }}
  >
    {props.children}
  </div>
);

const Row: Component<{ children: any }> = (props) => (
  <div
    style={{
      padding: "8px 12px",
      "border-bottom": "1px solid var(--sui-border)",
      color: "var(--sui-text-secondary)",
    }}
  >
    {props.children}
  </div>
);

export const ScrollRegionShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ScrollRegion — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (ScrollRegion.css), no component imports. DYNAMIC top/bottom fade
        scroll affordance: fades are computed at runtime from scroll position
        (onScroll + ResizeObserver + MutationObserver), so a fade only paints when
        there is genuinely more content in that direction. Height-agnostic — fills
        its flex parent. Curry bounded presets with{" "}
        <code>createScrollRegion(&#123; style &#125;)</code>.
      </p>

      <div class="example-group" style={{ display: "flex", gap: "24px", "flex-wrap": "wrap" }}>
        <div>
          <h3>Content fits — no fade</h3>
          <Box>
            <ScrollRegion style={{ height: "100%" }}>
              <For each={rows(3, "Fits")}>{(r) => <Row>{r}</Row>}</For>
            </ScrollRegion>
          </Box>
        </div>

        <div>
          <h3>Overflows — bottom fade</h3>
          <p class="text-meta">Scroll down: the bottom fade clears, the top fade appears.</p>
          <Box>
            <ScrollRegion style={{ height: "100%" }}>
              <For each={rows(30, "Overflow")}>{(r) => <Row>{r}</Row>}</For>
            </ScrollRegion>
          </Box>
        </div>

        <div>
          <h3>Scrolled to bottom — top fade</h3>
          <p class="text-meta">
            Pre-scrolled to the end: only the top fade shows.
          </p>
          <Box>
            <ScrollRegion
              style={{ height: "100%" }}
              ref={(el) =>
                queueMicrotask(() => {
                  const vp = el.querySelector(
                    ".sui-scroll-region__viewport",
                  ) as HTMLElement | null;
                  if (vp) vp.scrollTop = vp.scrollHeight;
                })
              }
            >
              <For each={rows(30, "Bottom")}>{(r) => <Row>{r}</Row>}</For>
            </ScrollRegion>
          </Box>
        </div>
      </div>
    </div>
  );
};
