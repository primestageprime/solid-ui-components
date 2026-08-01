import { type Component, For } from "solid-js";
import { ScrollRegion } from "../../src/components/ScrollRegion";
import { WrappedClusterRow } from "../../src/components/Layout/variants";

const rows = (n: number, label: string) =>
  Array.from({ length: n }, (_, i) => `${label} row ${i + 1}`);

const Box: Component<{ children: any }> = (props) => (
  <div class="scroll-region-demo__box">{props.children}</div>
);

const Row: Component<{ children: any }> = (props) => (
  <div class="scroll-region-demo__row">{props.children}</div>
);

export const ScrollRegionShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ScrollRegion — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (ScrollRegion.css), no component imports. DYNAMIC top/bottom
        fade scroll affordance: fades are computed at runtime from scroll
        position (onScroll + ResizeObserver + MutationObserver), so a fade only
        paints when there is genuinely more content in that direction.
        Height-agnostic — fills its flex parent. Curry bounded presets with{" "}
        <code>createScrollRegion(&#123; style &#125;)</code>.
      </p>

      <WrappedClusterRow class="example-group">
        <div>
          <h3>Content fits — no fade</h3>
          <Box>
            <ScrollRegion class="scroll-region-demo__fill">
              <For each={rows(3, "Fits")}>{(r) => <Row>{r}</Row>}</For>
            </ScrollRegion>
          </Box>
        </div>

        <div>
          <h3>Overflows — bottom fade</h3>
          <p class="text-meta">
            Scroll down: the bottom fade clears, the top fade appears.
          </p>
          <Box>
            <ScrollRegion class="scroll-region-demo__fill">
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
              class="scroll-region-demo__fill"
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
      </WrappedClusterRow>
    </div>
  );
};
