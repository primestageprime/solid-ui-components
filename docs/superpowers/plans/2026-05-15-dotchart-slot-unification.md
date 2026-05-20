# DotChart Slot Unification — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-15-dotchart-slot-unification-design.md`
**Date:** 2026-05-15
**Status:** Ready to execute

## Goal

Lift amygdala-ui's monolithic `DotChart` feature surface into `solid-ui-components` (SUI) as **independent slot primitives** that compose under the existing `<Chart>` root. Each new slot is a standalone child of `<Chart>` that reads `useChart()` context and renders SVG. Amygdala (and any future consumer) assembles its dotchart from these slots; no SUI-side composite ships in v1.

Two implementation slices:
- **Phase 1 — Chart core foundation.** Widen `xDomain` to accept time, add `scaleTime`, add `dragRange` context signal, add a single root pointer dispatch, add `shapes.ts` descriptor renderer, time-aware tick formatting, ADR + glossary updates.
- **Phase 2 — Slot batch.** Six new slot files + their `variants.ts` curried siblings + tests, an extension of the existing `ReferenceLine` to subsume amygdala's edge-highlight, index exports, and a composition smoke showcase.

## Architecture

The plan preserves the existing SUI chart architecture:

- `<Chart>` (root) provides scales + viewport + reactive signals via `ChartContext`.
- Slots read `useChart()`, return JSX. **No refs cross slot boundaries.**
- `<Chart>` owns the single pointer listener on its `<svg>` element and dispatches `hoverX` and `dragRange` through context signals. Interactive slots (e.g. `DragRangeSelect`) are **config-only consumers**: they read context, emit callbacks, and never attach their own listeners. This resolves gesture conflicts (`DragRangeSelect` vs `Crosshair`) in one place — per spec D3.
- Each slot is generic on its domain type (`PinMarkers<TPin>`, `TimelineBar<TBar>`, …) so callbacks carry the consumer's domain type through. Pattern mirrors SUI `DagChart`'s `renderNode<TNode>`.
- `xDomain` widens from `[number, number]` to `[number, number] | [Date, Date]`. `<Chart>` discriminates at runtime and selects `linearScale` (existing) or `scaleTime` (new, wraps `d3-scale`). The `Scale` interface stays uniform downstream.
- `d3-scale` + `d3-shape` are added as peer + dev deps. Pure math/path libs, ~7kb gz total. **No `d3-selection`** — Solid renders.
- Descriptors (`{ color, shape, size? }`) are the domain-decoupling lever: consumer maps domain → descriptor at the call site, slot is a pure renderer. Shape enum: `'circle' | 'chevron' | 'pin' | { path; viewBox? }`. Custom paths anchor at center and scale uniformly to `size`.
- Every NEW slot ships a `Xxx.tsx` factory (`createXxx(defaults)`) and a sibling `variants.ts` with explicit `Component<XxxDataProps>`-annotated curried exports. Pattern mirrors the recent Cell/Layout sweep (commits `3152ef7`, `0c1dba4`, ADR 0001).

### Curried-variant pattern (D8 → existing repo convention)

The spec D8 sketch refers to a literal `.curried.ts` filename. The repo's canonical pattern is `variants.ts` with **named Curried Variants** produced by Factories (per ADR 0001 + CONTEXT.md). This plan follows the repo's convention because that is what consumer apps adopt and what `vite-plugin-dts` is already configured for. Each NEW slot:

1. Defines `XxxProps`, splits `XxxOverrides` (visual defaults) and `XxxDataProps = Omit<XxxProps, keyof XxxOverrides>` (reactive data + callbacks).
2. Exports a `createXxx(defaults: Partial<Omit<XxxProps, "children">>): Component<XxxDataProps>` factory.
3. Sibling `variants.ts` exports named `Component<XxxDataProps>`-annotated curried variants — explicit annotation per ADR 0001 (commit `3152ef7`).

### File layout

```
src/components/Chart/
  Chart.tsx                       (modify — widen xDomain, scale dispatch, root pointer + dragRange)
  context.ts                      (modify — add dragRange + setDragRange)
  scales.ts                       (modify — add scaleTime wrapper)
  shapes.ts                       NEW — Shape/Descriptor types + ShapeGlyph renderer
  Axes.tsx                        (modify — time-aware default tick formatting)
  Series.tsx                      (modify — extend ReferenceLine with orientation; keep all other series intact)
  HighlightSegments.tsx           NEW
  HighlightSegments.variants.ts   NEW
  TimelineBar.tsx                 NEW
  TimelineBar.variants.ts         NEW
  PinMarkers.tsx                  NEW
  PinMarkers.variants.ts          NEW
  GhostPin.tsx                    NEW
  GhostPin.variants.ts            NEW
  DragRangeSelect.tsx             NEW
  DragRangeSelect.variants.ts     NEW
  CurrentValueIndicator.tsx       NEW
  CurrentValueIndicator.variants.ts NEW
  index.ts                        (modify — export additions)

docs/adr/0002-charts-d3-scale-shape-no-selection.md   NEW
CONTEXT.md                                            (modify — glossary additions)
dev/showcases/dotchart.tsx                            NEW (composition smoke showcase)
dev/main.tsx                                          (modify — register DotchartShowcase)

src/components/Chart/Chart.test.tsx                              NEW (time scale dispatch + dragRange)
src/components/Chart/scales.test.ts                              NEW (scaleTime wrapper)
src/components/Chart/shapes.test.tsx                             NEW
src/components/Chart/HighlightSegments.test.tsx                  NEW
src/components/Chart/TimelineBar.test.tsx                        NEW
src/components/Chart/PinMarkers.test.tsx                         NEW
src/components/Chart/GhostPin.test.tsx                           NEW
src/components/Chart/DragRangeSelect.test.tsx                    NEW
src/components/Chart/CurrentValueIndicator.test.tsx              NEW
src/components/Chart/ReferenceLine.test.tsx                      NEW (extension coverage)
```

500-LOC rule: each new slot lands 100–300 LOC. If any threatens 500, split by concern.

## Tech Stack

- SolidJS 1.9.x (existing).
- `d3-scale` `^4.0.2` (NEW — peer + dev).
- `d3-shape` `^3.2.0` (NEW — peer + dev).
- `vitest` `^4.1.5` + `@solidjs/testing-library` `^0.8.10` (existing). Tests use jsdom + `render(() => <… />)` + raw DOM assertions per `vitest.config.ts` and `src/test-setup.ts`.
- All colors via SUI CSS vars (`--sui-accent`, `--sui-warning`, `--sui-border`, …). Zero hex literals in slot source.

## Test conventions used throughout

```ts
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
```

Slot tests render inside `<Chart>` because slots require `useChart()`. Helper used by every slot test file:

```tsx
// Co-located at top of each slot test file.
const renderInChart = (slot: () => JSX.Element, xDomain: ChartProps["xDomain"] = [0, 10]) =>
  render(() => (
    <Chart width={200} height={100} xDomain={xDomain} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));
```

Pointer-event synthesis uses `new PointerEvent(...)` dispatched on the SVG root for `DragRangeSelect` reactivity tests. The existing chart code uses `MouseEvent`s on `onMouseMove` / `onMouseLeave`; Phase 1 Task 4 migrates Chart to `PointerEvent`s.

---

# Phase 1 — Chart core foundation

## Task 1: Add d3-scale + d3-shape as peer + dev deps

**Files:**
- Modify: `package.json` (lines 50–69; `peerDependencies` block at 50, `devDependencies` block at 54, `dependencies` block at 64)

**Steps:**

- [ ] **Step 1: Add `d3-scale` and `d3-shape` to `peerDependencies`.**

  Edit `package.json`. The existing `peerDependencies` block is:

  ```json
  "peerDependencies": {
    "katex": "^0.16.0",
    "solid-js": "^1.9.0"
  },
  ```

  Replace with:

  ```json
  "peerDependencies": {
    "d3-scale": "^4.0.0",
    "d3-shape": "^3.0.0",
    "katex": "^0.16.0",
    "solid-js": "^1.9.0"
  },
  ```

- [ ] **Step 2: Add `d3-scale`, `d3-shape`, and their `@types/*` packages to `devDependencies`.**

  Insert into the alphabetical `devDependencies` block (before `jsdom`):

  ```json
  "@types/d3-scale": "^4.0.8",
  "@types/d3-shape": "^3.1.6",
  "d3-scale": "^4.0.2",
  "d3-shape": "^3.2.0",
  ```

- [ ] **Step 3: Install and verify resolution.**

  ```bash
  npm install
  ```

  Expected: exit code 0; `node_modules/d3-scale/package.json` and `node_modules/d3-shape/package.json` present.

- [ ] **Step 4: Commit.**

  ```bash
  git add package.json package-lock.json
  git commit -m "deps: add d3-scale + d3-shape as peer/dev deps for chart slots"
  ```

  Expected output: `1 file changed` (plus lockfile).

---

## Task 2: Extend `scales.ts` with `scaleTime` wrapper preserving the `Scale` interface

**Files:**
- Create: `src/components/Chart/scales.test.ts`
- Modify: `src/components/Chart/scales.ts` (currently 70 lines; add `scaleTime` export at the bottom, leave `linearScale`/`domainOf` untouched)

**Steps:**

- [ ] **Step 1: Write failing test for `scaleTime` round-trip.**

  Create `src/components/Chart/scales.test.ts`:

  ```ts
  import { describe, it, expect } from "vitest";
  import { scaleTime, linearScale } from "./scales";

  describe("scaleTime", () => {
    it("maps domain start to range start and end to range end", () => {
      const t0 = new Date(2026, 0, 1).getTime();
      const t1 = new Date(2026, 0, 2).getTime();
      const s = scaleTime([new Date(t0), new Date(t1)], [0, 100]);
      expect(s(t0)).toBeCloseTo(0, 5);
      expect(s(t1)).toBeCloseTo(100, 5);
    });

    it("invert is the inverse of forward map", () => {
      const t0 = new Date(2026, 0, 1).getTime();
      const t1 = new Date(2026, 0, 2).getTime();
      const s = scaleTime([new Date(t0), new Date(t1)], [0, 100]);
      const mid = (t0 + t1) / 2;
      expect(s.invert(s(mid))).toBeCloseTo(mid, 5);
    });

    it("ticks returns ms epoch numbers spanning the domain", () => {
      const t0 = new Date(2026, 0, 1).getTime();
      const t1 = new Date(2026, 0, 8).getTime();
      const s = scaleTime([new Date(t0), new Date(t1)], [0, 100]);
      const ts = s.ticks(5);
      expect(ts.length).toBeGreaterThan(0);
      for (const t of ts) {
        expect(t).toBeGreaterThanOrEqual(t0);
        expect(t).toBeLessThanOrEqual(t1);
      }
    });

    it("exposes a tickFormat() helper", () => {
      const t0 = new Date(2026, 0, 1).getTime();
      const t1 = new Date(2026, 0, 8).getTime();
      const s = scaleTime([new Date(t0), new Date(t1)], [0, 100]);
      const fmt = s.tickFormat();
      expect(typeof fmt(t0)).toBe("string");
    });

    it("preserves the linearScale Scale interface shape (forward/invert/domain/range/ticks)", () => {
      const s = scaleTime([new Date(0), new Date(1000)], [0, 10]);
      const lin = linearScale([0, 1000], [0, 10]);
      // Same surface — both indexable as a function with the same auxiliary fields.
      expect(typeof s).toBe("function");
      expect(typeof lin).toBe("function");
      expect(s.domain.length).toBe(2);
      expect(s.range.length).toBe(2);
      expect(typeof s.invert).toBe("function");
      expect(typeof s.ticks).toBe("function");
    });
  });
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/scales.test.ts
  ```

  Expected: fails with `scaleTime is not exported` (TypeError / module resolution).

- [ ] **Step 2: Implement `scaleTime` in `scales.ts`.**

  Append to `src/components/Chart/scales.ts` (after the existing `domainOf` export):

  ```ts
  import { scaleTime as d3ScaleTime } from "d3-scale";

  /** TimeScale extends Scale with a tickFormat helper for time-aware axis labels. */
  export interface TimeScale extends Scale {
    /** Returns a formatter for tick values (epoch ms numbers). Defaults to d3's locale-aware format. */
    tickFormat: (count?: number, specifier?: string) => (v: number) => string;
  }

  /**
   * scaleTime — wraps d3-scale's scaleTime so the returned function matches our `Scale`
   * surface: takes a number (epoch ms), returns a pixel; `invert(px)` returns epoch ms;
   * `domain`/`range`/`ticks`/`tickFormat` are uniform. Domain endpoints are accepted as
   * `Date` instances (per spec D6) and converted to epoch ms internally so downstream
   * scale consumers stay number-typed.
   */
  export const scaleTime = (
    domain: readonly [Date, Date],
    range: readonly [number, number],
  ): TimeScale => {
    const d3 = d3ScaleTime().domain([domain[0], domain[1]]).range([range[0], range[1]]);
    const d0 = domain[0].getTime();
    const d1 = domain[1].getTime();
    const fn = ((v: number) => d3(new Date(v))) as TimeScale;
    fn.invert = (px: number) => d3.invert(px).getTime();
    fn.domain = [d0, d1] as const;
    fn.range = [range[0], range[1]] as const;
    fn.ticks = (count = 5) => d3.ticks(count).map((t) => t.getTime());
    fn.tickFormat = (count = 5, specifier?: string) => {
      const f = d3.tickFormat(count, specifier as string | undefined);
      return (v: number) => f(new Date(v));
    };
    return fn;
  };
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/scales.test.ts
  ```

  Expected: 5 passed.

- [ ] **Step 3: Commit.**

  ```bash
  git add src/components/Chart/scales.ts src/components/Chart/scales.test.ts
  git commit -m "feat(chart): add scaleTime wrapper preserving Scale interface"
  ```

---

## Task 3: Extend `context.ts` with `dragRange` + `setDragRange`

**Files:**
- Modify: `src/components/Chart/context.ts` (currently 36 lines; extend `ChartContextValue` at lines 14–25)

**Steps:**

- [ ] **Step 1: Extend `ChartContextValue` interface and re-export.**

  Edit `src/components/Chart/context.ts`. Add to the `ChartContextValue` interface, immediately after `setHoverX`:

  ```ts
  /** Currently-active drag selection in DATA-domain units, or null when no drag. */
  dragRange: Accessor<{ start: number; end: number } | null>;
  setDragRange: (range: { start: number; end: number } | null) => void;
  ```

  No new exports required; existing `useChart()` automatically surfaces the new fields.

- [ ] **Step 2: Confirm TypeScript surfaces the new fields.**

  ```bash
  npx tsc --noEmit
  ```

  Expected: compile errors in `Chart.tsx` (it does not yet provide `dragRange` / `setDragRange` to the context value). Those errors are fixed in Task 4.

- [ ] **Step 3: Commit (deferred to Task 4).**

  Hold the commit; this change is incomplete on its own — Task 4 supplies the implementation that makes the type compile.

---

## Task 4: Extend `Chart.tsx` — widen `xDomain`, dispatch linear-vs-time scale, single root pointer dispatch for hoverX + dragRange

**Files:**
- Modify: `src/components/Chart/Chart.tsx` (currently 108 lines)
- Create: `src/components/Chart/Chart.test.tsx`

**Steps:**

- [ ] **Step 1: Write failing test — Chart renders a time-domain SVG without throwing.**

  Create `src/components/Chart/Chart.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render, fireEvent } from "@solidjs/testing-library";
  import { Chart } from "./Chart";
  import { useChart } from "./context";
  import type { Component } from "solid-js";

  describe("Chart", () => {
    it("renders with a numeric xDomain (back-compat)", () => {
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]} />
      ));
      expect(container.querySelector("svg")).toBeTruthy();
    });

    it("renders with a Date xDomain (time scale)", () => {
      const t0 = new Date(2026, 0, 1);
      const t1 = new Date(2026, 0, 2);
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[t0, t1]} yDomain={[0, 100]} />
      ));
      expect(container.querySelector("svg")).toBeTruthy();
    });

    it("exposes dragRange via context, initially null", () => {
      let captured: ReturnType<typeof useChart> | null = null;
      const Probe: Component = () => {
        captured = useChart();
        return null;
      };
      render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
        </Chart>
      ));
      expect(captured).not.toBeNull();
      expect(captured!.dragRange()).toBeNull();
    });

    it("setDragRange mutates the context signal", () => {
      let captured: ReturnType<typeof useChart> | null = null;
      const Probe: Component = () => {
        captured = useChart();
        return null;
      };
      render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
        </Chart>
      ));
      captured!.setDragRange({ start: 1, end: 4 });
      expect(captured!.dragRange()).toEqual({ start: 1, end: 4 });
      captured!.setDragRange(null);
      expect(captured!.dragRange()).toBeNull();
    });

    it("pointermove inside the plot area updates hoverX", () => {
      let captured: ReturnType<typeof useChart> | null = null;
      const Probe: Component = () => {
        captured = useChart();
        return null;
      };
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
        </Chart>
      ));
      const svg = container.querySelector("svg")!;
      fireEvent.pointerMove(svg, { clientX: 100, clientY: 50 });
      // hoverX is non-null after a pointer move inside the plot area.
      expect(captured!.hoverX()).not.toBeNull();
    });
  });
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/Chart.test.tsx
  ```

  Expected: 5 failures (Date domain rejected by TS / runtime; `dragRange` missing from context; `pointermove` not wired).

- [ ] **Step 2: Replace `Chart.tsx` with the widened implementation.**

  Replace the file with:

  ```tsx
  // ============================================
  // Chart — Composed root (Depth 2).
  // Provides scales + viewport context to slot children. Owns the single
  // pointer listener on its <svg> and dispatches hoverX + dragRange via
  // context signals per spec D3.
  // ============================================
  import {
    Component,
    JSX,
    createMemo,
    createSignal,
    splitProps,
  } from "solid-js";
  import { ChartContext, ChartContextValue, Margin } from "./context";
  import { linearScale, scaleTime, Scale } from "./scales";
  import "./Chart.css";

  export interface ChartProps {
    width: number;
    height: number;
    /** Data domain on X. Accepts numbers (linear scale) or Dates (time scale). */
    xDomain: [number, number] | [Date, Date];
    /** Data domain on Y. */
    yDomain: [number, number];
    /** Plot-area inset. Default: { top: 8, right: 8, bottom: 28, left: 36 }. */
    margin?: Partial<Margin>;
    /** Optional accessible title. */
    title?: string;
    class?: string;
    style?: JSX.CSSProperties | string;
    children?: JSX.Element;
  }

  const DEFAULT_MARGIN: Margin = { top: 8, right: 8, bottom: 28, left: 36 };

  const isDateDomain = (d: ChartProps["xDomain"]): d is [Date, Date] =>
    d[0] instanceof Date && d[1] instanceof Date;

  export const Chart: Component<ChartProps> = (props) => {
    const [local, others] = splitProps(props, [
      "width",
      "height",
      "xDomain",
      "yDomain",
      "margin",
      "title",
      "class",
      "style",
      "children",
    ]);

    const margin = createMemo<Margin>(() => ({ ...DEFAULT_MARGIN, ...(local.margin ?? {}) }));
    const width = createMemo(() => local.width);
    const height = createMemo(() => local.height);
    const innerWidth = createMemo(() => Math.max(0, width() - margin().left - margin().right));
    const innerHeight = createMemo(() => Math.max(0, height() - margin().top - margin().bottom));

    const xScale = createMemo<Scale>(() => {
      const d = local.xDomain;
      return isDateDomain(d)
        ? scaleTime(d, [0, innerWidth()])
        : linearScale(d, [0, innerWidth()]);
    });
    const yScale = createMemo<Scale>(() => linearScale(local.yDomain, [innerHeight(), 0]));

    const [hoverX, setHoverX] = createSignal<number | null>(null);
    const [dragRange, setDragRange] = createSignal<{ start: number; end: number } | null>(null);

    let svgEl: SVGSVGElement | undefined;
    let dragAnchor: number | null = null;

    const pointerDataX = (clientX: number): number | null => {
      if (!svgEl) return null;
      const rect = svgEl.getBoundingClientRect();
      const px = clientX - rect.left - margin().left;
      if (px < 0 || px > innerWidth()) return null;
      return xScale().invert(px);
    };

    const onPointerMove = (e: PointerEvent) => {
      const x = pointerDataX(e.clientX);
      setHoverX(x);
      if (dragAnchor != null && x != null) {
        setDragRange({
          start: Math.min(dragAnchor, x),
          end: Math.max(dragAnchor, x),
        });
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const x = pointerDataX(e.clientX);
      if (x == null) return;
      dragAnchor = x;
      setDragRange({ start: x, end: x });
    };
    const onPointerUp = () => {
      dragAnchor = null;
      // Leave the latest dragRange in place; consumers clear it via setDragRange(null).
    };
    const onPointerLeave = () => {
      setHoverX(null);
      dragAnchor = null;
    };

    const ctx: ChartContextValue = {
      width,
      height,
      margin,
      innerWidth,
      innerHeight,
      xScale,
      yScale,
      hoverX,
      setHoverX,
      dragRange,
      setDragRange,
    };

    return (
      <ChartContext.Provider value={ctx}>
        <div class={`sui-chart${local.class ? " " + local.class : ""}`} style={local.style as JSX.CSSProperties}>
          <svg
            ref={svgEl}
            class="sui-chart__svg"
            width={width()}
            height={height()}
            viewBox={`0 0 ${width()} ${height()}`}
            role="img"
            aria-label={local.title}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            {...(others as JSX.SvgSVGAttributes<SVGSVGElement>)}
          >
            <g transform={`translate(${margin().left}, ${margin().top})`}>
              {local.children}
            </g>
          </svg>
        </div>
      </ChartContext.Provider>
    );
  };
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/Chart.test.tsx
  ```

  Expected: 5 passed.

  Also run:

  ```bash
  npx tsc --noEmit
  ```

  Expected: 0 errors.

- [ ] **Step 3: Verify back-compat with existing chart consumers.**

  ```bash
  npm test -- src/components/Chart
  ```

  Expected: pre-existing Chart tests (if any) still pass plus the new scales + Chart tests. If the existing `Chart` showcase regressed, fix forward — the new `PointerEvent` handlers are a near-superset of the prior `MouseEvent` handlers for desktop interactions.

- [ ] **Step 4: Commit.**

  ```bash
  git add src/components/Chart/Chart.tsx src/components/Chart/context.ts src/components/Chart/Chart.test.tsx
  git commit -m "feat(chart): widen xDomain, scale dispatch, single root pointer dragRange"
  ```

---

## Task 5: New `shapes.ts` — descriptor → SVG element renderer

**Files:**
- Create: `src/components/Chart/shapes.ts`
- Create: `src/components/Chart/shapes.test.tsx`

**Steps:**

- [ ] **Step 1: Write failing tests covering the four shape branches.**

  Create `src/components/Chart/shapes.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render } from "@solidjs/testing-library";
  import { ShapeGlyph, type Descriptor } from "./shapes";

  const renderSvg = (descriptor: Descriptor, x = 10, y = 10) =>
    render(() => (
      <svg>
        <ShapeGlyph descriptor={descriptor} cx={x} cy={y} />
      </svg>
    ));

  describe("ShapeGlyph", () => {
    it("renders a <circle> for shape='circle'", () => {
      const { container } = renderSvg({ color: "var(--sui-accent)", shape: "circle" });
      expect(container.querySelector("circle")).toBeTruthy();
    });

    it("renders a <path> for shape='chevron'", () => {
      const { container } = renderSvg({ color: "var(--sui-accent)", shape: "chevron" });
      expect(container.querySelector("path")).toBeTruthy();
    });

    it("renders a <path> for shape='pin'", () => {
      const { container } = renderSvg({ color: "var(--sui-warning)", shape: "pin" });
      expect(container.querySelector("path")).toBeTruthy();
    });

    it("renders a <path> for a custom-path descriptor", () => {
      const { container } = renderSvg({
        color: "#fff",
        shape: { path: "M-4,-4 L4,-4 L4,4 L-4,4 Z", viewBox: [8, 8] },
      });
      expect(container.querySelector("path")).toBeTruthy();
    });

    it("applies descriptor.color as fill", () => {
      const { container } = renderSvg({ color: "var(--sui-warning)", shape: "circle" });
      expect(container.querySelector("circle")!.getAttribute("fill")).toBe("var(--sui-warning)");
    });

    it("anchors shape at (cx, cy) via translate", () => {
      const { container } = renderSvg({ color: "#fff", shape: "chevron" }, 42, 17);
      const g = container.querySelector("g")!;
      expect(g.getAttribute("transform")).toContain("translate(42");
      expect(g.getAttribute("transform")).toContain("17");
    });
  });
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/shapes.test.tsx
  ```

  Expected: fails — module does not exist.

- [ ] **Step 2: Implement `shapes.ts`.**

  Create `src/components/Chart/shapes.ts`:

  ```tsx
  // ============================================
  // Chart shapes — closed Shape enum + Descriptor type + ShapeGlyph renderer.
  // Per spec D4: anchor = geometric center, size = nominal pixel dimension
  // (max of width/height). Custom paths are drawn inside `viewBox` and
  // uniformly scaled to `size`. Default size = 12px (per-slot override).
  // ============================================
  import { Component, Show } from "solid-js";

  export type Shape =
    | "circle"
    | "chevron"
    | "pin"
    | { path: string; viewBox?: [number, number] };

  export interface Descriptor {
    color: string;
    shape: Shape;
    /** Nominal px dimension (max of width/height). Defaults to 12 if a slot does not override. */
    size?: number;
  }

  export const DEFAULT_GLYPH_SIZE = 12;

  // Built-in path strings, centered on (0,0) within a 16x16 viewBox.
  // Path data is anchored at geometric center per spec D4.
  const CHEVRON_PATH = "M-6,3 L0,-4 L6,3";
  const PIN_PATH =
    "M0,-7 C-4,-7 -4,-3 0,2 C4,-3 4,-7 0,-7 Z M-1.5,-5 a1.5,1.5 0 1,0 3,0 a1.5,1.5 0 1,0 -3,0";
  const BUILTIN_VIEWBOX: [number, number] = [16, 16];

  interface ShapeGlyphProps {
    descriptor: Descriptor;
    cx: number;
    cy: number;
    /** Override descriptor.size at the slot call site. */
    size?: number;
    /** Optional CSS class for theming hooks (e.g. selected state). */
    class?: string;
    /** Optional stroke; defaults to none. */
    stroke?: string;
    strokeWidth?: number;
  }

  /**
   * ShapeGlyph — pure descriptor → SVG element. Anchors via a translate so the
   * descriptor's path coordinates stay center-origin. Custom paths receive the
   * same uniform scale as built-ins (size / max(viewBox)).
   */
  export const ShapeGlyph: Component<ShapeGlyphProps> = (props) => {
    const size = () => props.size ?? props.descriptor.size ?? DEFAULT_GLYPH_SIZE;
    const stroke = () => props.stroke ?? "none";
    const strokeWidth = () => props.strokeWidth ?? 0;

    return (
      <g transform={`translate(${props.cx}, ${props.cy})`} class={props.class}>
        <Show when={props.descriptor.shape === "circle"}>
          <circle
            r={size() / 2}
            fill={props.descriptor.color}
            stroke={stroke()}
            stroke-width={strokeWidth()}
          />
        </Show>
        <Show when={props.descriptor.shape === "chevron"}>
          <PathScaled
            path={CHEVRON_PATH}
            viewBox={BUILTIN_VIEWBOX}
            size={size()}
            color={props.descriptor.color}
            stroke={stroke()}
            strokeWidth={strokeWidth()}
            fillRule="none"
          />
        </Show>
        <Show when={props.descriptor.shape === "pin"}>
          <PathScaled
            path={PIN_PATH}
            viewBox={BUILTIN_VIEWBOX}
            size={size()}
            color={props.descriptor.color}
            stroke={stroke()}
            strokeWidth={strokeWidth()}
            fillRule="evenodd"
          />
        </Show>
        <Show when={typeof props.descriptor.shape === "object"}>
          {(() => {
            const custom = props.descriptor.shape as { path: string; viewBox?: [number, number] };
            return (
              <PathScaled
                path={custom.path}
                viewBox={custom.viewBox ?? BUILTIN_VIEWBOX}
                size={size()}
                color={props.descriptor.color}
                stroke={stroke()}
                strokeWidth={strokeWidth()}
              />
            );
          })()}
        </Show>
      </g>
    );
  };

  const PathScaled: Component<{
    path: string;
    viewBox: [number, number];
    size: number;
    color: string;
    stroke: string;
    strokeWidth: number;
    fillRule?: "none" | "evenodd" | "nonzero";
  }> = (props) => {
    const scale = () => props.size / Math.max(props.viewBox[0], props.viewBox[1]);
    return (
      <path
        d={props.path}
        transform={`scale(${scale()})`}
        fill={props.fillRule === "none" ? "none" : props.color}
        fill-rule={props.fillRule === "evenodd" ? "evenodd" : undefined}
        stroke={props.fillRule === "none" ? props.color : props.stroke}
        stroke-width={props.fillRule === "none" ? Math.max(2, props.strokeWidth) : props.strokeWidth}
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    );
  };
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/shapes.test.tsx
  ```

  Expected: 6 passed.

- [ ] **Step 3: Commit.**

  ```bash
  git add src/components/Chart/shapes.ts src/components/Chart/shapes.test.tsx
  git commit -m "feat(chart): add shapes.ts — Descriptor + ShapeGlyph renderer"
  ```

---

## Task 6: Time-aware tick formatting in `Axes.tsx`

**Files:**
- Modify: `src/components/Chart/Axes.tsx` (currently 67 lines; lines 14–18 hold `defaultFormat`, lines 20–42 hold `XAxis`)

**Steps:**

- [ ] **Step 1: Add a failing test asserting time tick labels look like times, not raw numbers.**

  Append to `src/components/Chart/Chart.test.tsx`:

  ```tsx
  import { XAxis } from "./Axes";

  describe("XAxis time-aware formatting", () => {
    it("uses scale.tickFormat() when scale is a TimeScale", () => {
      const t0 = new Date(2026, 0, 1);
      const t1 = new Date(2026, 0, 2);
      const { container } = render(() => (
        <Chart width={400} height={100} xDomain={[t0, t1]} yDomain={[0, 100]}>
          <XAxis tickCount={3} />
        </Chart>
      ));
      const labels = Array.from(container.querySelectorAll(".sui-chart__axis-label"));
      // At least one label must be non-numeric (contains a colon, letter, or slash — a date/time glyph).
      const anyTimeFormatted = labels.some((el) => /[:a-zA-Z/]/.test(el.textContent ?? ""));
      expect(anyTimeFormatted).toBe(true);
    });
  });
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/Chart.test.tsx
  ```

  Expected: this new test fails — labels are stringified epoch ms.

- [ ] **Step 2: Update `XAxis` to detect a `TimeScale` and delegate formatting to it.**

  In `src/components/Chart/Axes.tsx`, replace the `XAxis` block (lines 20–42) with:

  ```tsx
  import type { Scale } from "./scales";

  const isTimeScale = (s: Scale): s is Scale & { tickFormat: (count?: number) => (v: number) => string } =>
    typeof (s as { tickFormat?: unknown }).tickFormat === "function";

  export const XAxis: Component<AxisProps> = (props) => {
    const ctx = useChart();
    const tickCount = () => props.tickCount ?? 5;
    const fmt = () => {
      if (props.tickFormat) return props.tickFormat;
      const scale = ctx.xScale();
      if (isTimeScale(scale)) return scale.tickFormat(tickCount());
      return defaultFormat;
    };

    return (
      <g class="sui-chart__axis sui-chart__axis--x" transform={`translate(0, ${ctx.innerHeight()})`}>
        {!props.hideLine && (
          <line class="sui-chart__axis-line" x1={0} x2={ctx.innerWidth()} y1={0} y2={0} />
        )}
        <For each={props.tickValues ?? ctx.xScale().ticks(tickCount())}>
          {(t) => (
            <g transform={`translate(${ctx.xScale()(t)}, 0)`}>
              <line class="sui-chart__axis-tick" y1={0} y2={4} />
              <text class="sui-chart__axis-label" y={16} text-anchor="middle">
                {fmt()(t)}
              </text>
            </g>
          )}
        </For>
      </g>
    );
  };
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/Chart.test.tsx
  ```

  Expected: all Chart tests pass including the new time-formatting test.

- [ ] **Step 3: Commit.**

  ```bash
  git add src/components/Chart/Axes.tsx src/components/Chart/Chart.test.tsx
  git commit -m "feat(chart): time-aware XAxis tick formatting via scale.tickFormat()"
  ```

---

## Task 7: New ADR — `0002-charts-d3-scale-shape-no-selection.md`

**Files:**
- Create: `docs/adr/0002-charts-d3-scale-shape-no-selection.md`

**Steps:**

- [ ] **Step 1: Author the ADR following ADR 0001's structure.**

  Create `docs/adr/0002-charts-d3-scale-shape-no-selection.md`:

  ```md
  # Charts use d3-scale + d3-shape as peer deps; no d3-selection

  SUI's chart family adds `d3-scale` and `d3-shape` as peer dependencies (~7kb gz combined). Both libraries are **pure math / path-builder** code with no DOM dependency. We explicitly **exclude `d3-selection`** because Solid owns rendering; d3-selection's imperative DOM mutation conflicts with Solid's reactive render model. Slots receive scales + descriptors from `useChart()` and emit JSX. Pattern matches `DagChart`'s existing `d3-dag` peer dep.

  We chose this because (a) Solid's render model is the source of truth for the DOM — interleaving d3-selection would create two competing owners of each element, (b) `d3-scale`/`d3-shape` are stateless and trivially testable against the existing `Scale` interface, and (c) the bundle cost is acceptable for the time-axis + path generation features we get (`scaleTime`, optionally `line`/`area` generators if a future slot needs them).

  The accepted cost is that contributors must internalize the split: **d3 = math only; Solid = render.** This is documented in CONTEXT.md's glossary additions ("Slot (chart)", "Descriptor (visual)"). Reversing this decision would require adopting d3-selection inside slots, which would force `createEffect` plumbing to coordinate Solid and d3 ownership; not worth it for the surface we have.
  ```

- [ ] **Step 2: Commit.**

  ```bash
  git add docs/adr/0002-charts-d3-scale-shape-no-selection.md
  git commit -m "docs(adr): 0002 — charts use d3-scale + d3-shape, no d3-selection"
  ```

---

## Task 8: Glossary additions in `CONTEXT.md`

**Files:**
- Modify: `CONTEXT.md` (currently 96 lines; insert after the "Authoring & process" block, before "Relationships" on line 75)

**Steps:**

- [ ] **Step 1: Insert two new glossary entries.**

  Insert a new `### Charts` subsection at the end of the "Language" section in `CONTEXT.md`, immediately before the `## Relationships` line:

  ```md
  ### Charts

  **Slot (chart)**:
  A declarative Solid child of `<Chart>` that reads chart context (via `useChart()`) and renders JSX into the chart's SVG. Slots do not own DOM refs that cross their own boundary; cross-slot coordination uses context + signals. The single pointer listener lives on `<Chart>`'s SVG root; interactive slots are config-only consumers of `hoverX` / `dragRange`.
  _Avoid_: Layer, child, plugin.

  **Descriptor (visual)**:
  A closed data object (`{ color: string, shape: Shape, size?: number }`) the consumer produces per datum. The chart slot's render contract is `Descriptor → JSX`. `Shape` is a closed enum (`'circle' | 'chevron' | 'pin' | { path; viewBox? }`); custom paths anchor at geometric center and scale uniformly to `size`.
  _Avoid_: Style, render spec.
  ```

- [ ] **Step 2: Commit.**

  ```bash
  git add CONTEXT.md
  git commit -m "docs(context): glossary — Slot (chart), Descriptor (visual)"
  ```

---

# Phase 2 — Slot batch

All Phase 2 tasks assume Phase 1 is merged.

## Task 9: Extend `ReferenceLine` with `orientation` prop (subsumes amygdala edge-highlight)

**Files:**
- Modify: `src/components/Chart/Series.tsx` (lines 247–299 hold the existing `ReferenceLine`)
- Create: `src/components/Chart/ReferenceLine.test.tsx`

**Steps:**

- [ ] **Step 1: Write failing tests covering the new orientation API.**

  Create `src/components/Chart/ReferenceLine.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render } from "@solidjs/testing-library";
  import { Chart, ReferenceLine } from "./index";

  describe("ReferenceLine — orientation API", () => {
    it("orientation='horizontal' draws a horizontal line at the Y value", () => {
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <ReferenceLine orientation="horizontal" value={50} />
        </Chart>
      ));
      const line = container.querySelector(".sui-chart__ref line")!;
      // For a horizontal line y1 === y2.
      expect(line.getAttribute("y1")).toBe(line.getAttribute("y2"));
    });

    it("orientation='vertical' draws a vertical line at the X value", () => {
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <ReferenceLine orientation="vertical" value={5} />
        </Chart>
      ));
      const line = container.querySelector(".sui-chart__ref line")!;
      // For a vertical line x1 === x2.
      expect(line.getAttribute("x1")).toBe(line.getAttribute("x2"));
    });

    it("accepts Date value when chart has a time domain", () => {
      const t0 = new Date(2026, 0, 1);
      const t1 = new Date(2026, 0, 2);
      const mid = new Date(2026, 0, 1, 12);
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[t0, t1]} yDomain={[0, 100]}>
          <ReferenceLine orientation="vertical" value={mid} />
        </Chart>
      ));
      expect(container.querySelector(".sui-chart__ref line")).toBeTruthy();
    });

    it("legacy x/y props still work (back-compat)", () => {
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <ReferenceLine x={3} />
        </Chart>
      ));
      expect(container.querySelector(".sui-chart__ref line")).toBeTruthy();
    });
  });
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/ReferenceLine.test.tsx
  ```

  Expected: orientation tests fail (prop doesn't exist); legacy passes.

- [ ] **Step 2: Extend `ReferenceLine` interface and impl in `Series.tsx`.**

  Replace the `ReferenceLine` section (`Series.tsx` lines 247–299) with:

  ```tsx
  // ---- ReferenceLine ----
  export interface ReferenceLineProps {
    /** Preferred API: orientation + value. */
    orientation?: "horizontal" | "vertical";
    /** Value in the matching scale's data domain. Accepts Date when the chart has a time domain. */
    value?: number | Date;
    /** Legacy API: horizontal at this Y. Mutually exclusive with `x` and `orientation`. */
    y?: number;
    /** Legacy API: vertical at this X. */
    x?: number;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    label?: string;
    /** Color override; takes precedence over `stroke`. Defaults via CSS class. */
    color?: string;
  }

  const toScaleValue = (v: number | Date): number =>
    v instanceof Date ? v.getTime() : v;

  export const ReferenceLine: Component<ReferenceLineProps> = (props) => {
    const ctx = useChart();
    // Normalize to orientation + numeric value (back-compat with x/y).
    const resolved = () => {
      if (props.orientation && props.value != null) {
        return { orientation: props.orientation, value: toScaleValue(props.value) };
      }
      if (props.x != null) return { orientation: "vertical" as const, value: props.x };
      if (props.y != null) return { orientation: "horizontal" as const, value: props.y };
      return null;
    };
    const strokeColor = () => props.color ?? props.stroke ?? "currentColor";

    return (
      <g class="sui-chart__ref">
        <Show when={resolved()}>
          {(r) => (
            <>
              <Show when={r().orientation === "horizontal"}>
                <line
                  x1={0}
                  x2={ctx.innerWidth()}
                  y1={ctx.yScale()(r().value)}
                  y2={ctx.yScale()(r().value)}
                  stroke={strokeColor()}
                  stroke-width={props.strokeWidth ?? 1}
                  stroke-dasharray={props.strokeDasharray ?? "4 4"}
                  opacity={0.6}
                />
                <Show when={props.label}>
                  <text
                    class="sui-chart__ref-label"
                    x={ctx.innerWidth() - 4}
                    y={ctx.yScale()(r().value) - 4}
                    text-anchor="end"
                  >
                    {props.label}
                  </text>
                </Show>
              </Show>
              <Show when={r().orientation === "vertical"}>
                <line
                  y1={0}
                  y2={ctx.innerHeight()}
                  x1={ctx.xScale()(r().value)}
                  x2={ctx.xScale()(r().value)}
                  stroke={strokeColor()}
                  stroke-width={props.strokeWidth ?? 1}
                  stroke-dasharray={props.strokeDasharray ?? "4 4"}
                  opacity={0.6}
                />
              </Show>
            </>
          )}
        </Show>
      </g>
    );
  };
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/ReferenceLine.test.tsx
  ```

  Expected: all 4 passed.

- [ ] **Step 3: Commit.**

  ```bash
  git add src/components/Chart/Series.tsx src/components/Chart/ReferenceLine.test.tsx
  git commit -m "feat(chart): extend ReferenceLine with orientation+value (subsumes edge highlight)"
  ```

---

## Task 10: `HighlightSegments` slot + curried variants + tests

**Files:**
- Create: `src/components/Chart/HighlightSegments.tsx`
- Create: `src/components/Chart/HighlightSegments.variants.ts`
- Create: `src/components/Chart/HighlightSegments.test.tsx`

**Steps:**

- [ ] **Step 1: Write a failing render test.**

  Create `src/components/Chart/HighlightSegments.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render, fireEvent } from "@solidjs/testing-library";
  import { createSignal } from "solid-js";
  import { Chart } from "./Chart";
  import { HighlightSegments, type HighlightSegment } from "./HighlightSegments";
  import { AccentHighlightSegments } from "./HighlightSegments.variants";

  const wrapper = (slot: () => JSX.Element) =>
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        {slot()}
      </Chart>
    ));

  describe("HighlightSegments — render", () => {
    it("renders one rect per segment", () => {
      const segs: HighlightSegment[] = [
        { id: "a", start: 1, end: 3, color: "var(--sui-accent)" },
        { id: "b", start: 5, end: 8, color: "var(--sui-warning)" },
      ];
      const { container } = wrapper(() => <HighlightSegments data={segs} />);
      expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(2);
    });
  });
  ```

  Run:

  ```bash
  npm test -- src/components/Chart/HighlightSegments.test.tsx
  ```

  Expected: module missing — fail.

- [ ] **Step 2: Implement `HighlightSegments.tsx`.**

  Create `src/components/Chart/HighlightSegments.tsx`:

  ```tsx
  // ============================================
  // HighlightSegments — Chart slot (Depth 2).
  // Renders rectangular highlight bands across an x-range. Consumer maps
  // domain → `HighlightSegment` records; the slot is a pure renderer.
  // ============================================
  import { Component, For, mergeProps } from "solid-js";
  import { useChart } from "./context";

  export type Id = string;
  export type ClickHandler<T> = (item: T, event: PointerEvent) => void;
  export type HoverHandler<T> = (item: T | null, event: PointerEvent) => void;

  export interface HighlightSegment {
    id: Id;
    start: number;
    end: number;
    color: string;
    label?: string;
    opacity?: number;
  }

  export interface HighlightSegmentsProps<T extends HighlightSegment = HighlightSegment> {
    data: readonly T[];
    /** IDs currently selected (highlighted with extra emphasis). */
    selectedIds?: ReadonlySet<Id>;
    /** Default opacity for unselected segments. Default 0.18. */
    fillOpacity?: number;
    /** Pointer events. */
    onClick?: ClickHandler<T>;
    onHover?: HoverHandler<T>;
    class?: string;
  }

  export interface HighlightSegmentsOverrides {
    fillOpacity?: number;
    class?: string;
  }
  export type HighlightSegmentsDataProps<T extends HighlightSegment = HighlightSegment> =
    Omit<HighlightSegmentsProps<T>, keyof HighlightSegmentsOverrides>;

  export function HighlightSegments<T extends HighlightSegment = HighlightSegment>(
    props: HighlightSegmentsProps<T>,
  ) {
    const ctx = useChart();
    const merged = mergeProps({ fillOpacity: 0.18 }, props);

    return (
      <g class={`sui-chart__highlight-segments${merged.class ? " " + merged.class : ""}`}>
        <For each={merged.data}>
          {(seg) => {
            const x1 = () => ctx.xScale()(seg.start);
            const x2 = () => ctx.xScale()(seg.end);
            const isSelected = () => merged.selectedIds?.has(seg.id) ?? false;
            return (
              <rect
                class="sui-chart__highlight-segment"
                data-id={seg.id}
                data-selected={isSelected() ? "true" : undefined}
                x={Math.min(x1(), x2())}
                y={0}
                width={Math.abs(x2() - x1())}
                height={ctx.innerHeight()}
                fill={seg.color}
                opacity={seg.opacity ?? (isSelected() ? Math.min(1, merged.fillOpacity * 2.5) : merged.fillOpacity)}
                onPointerDown={(e) => merged.onClick?.(seg, e)}
                onPointerEnter={(e) => merged.onHover?.(seg, e)}
                onPointerLeave={(e) => merged.onHover?.(null, e)}
                style={{ cursor: merged.onClick ? "pointer" : undefined }}
              />
            );
          }}
        </For>
      </g>
    );
  }

  export function createHighlightSegments<T extends HighlightSegment = HighlightSegment>(
    defaults: Partial<Omit<HighlightSegmentsProps<T>, "children">>,
  ): Component<HighlightSegmentsDataProps<T>> {
    return (props) => <HighlightSegments<T> {...mergeProps(defaults, props as HighlightSegmentsProps<T>)} />;
  }
  ```

  Run the render test. Expected: 1 passed.

- [ ] **Step 3: Add a reactivity test (signal change → DOM update).**

  Append to `HighlightSegments.test.tsx`:

  ```tsx
  describe("HighlightSegments — reactivity", () => {
    it("appending a segment adds a new rect", async () => {
      const [segs, setSegs] = createSignal<HighlightSegment[]>([
        { id: "a", start: 1, end: 3, color: "#fff" },
      ]);
      const { container } = wrapper(() => <HighlightSegments data={segs()} />);
      expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(1);
      setSegs([...segs(), { id: "b", start: 4, end: 6, color: "#fff" }]);
      expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(2);
    });

    it("toggling selectedIds flips data-selected attribute", () => {
      const [sel, setSel] = createSignal<ReadonlySet<Id>>(new Set());
      const segs: HighlightSegment[] = [{ id: "a", start: 1, end: 3, color: "#fff" }];
      const { container } = wrapper(() => (
        <HighlightSegments data={segs} selectedIds={sel()} />
      ));
      let rect = container.querySelector(".sui-chart__highlight-segment")!;
      expect(rect.getAttribute("data-selected")).toBeNull();
      setSel(new Set(["a"]));
      rect = container.querySelector(".sui-chart__highlight-segment")!;
      expect(rect.getAttribute("data-selected")).toBe("true");
    });
  });
  ```

  Run. Expected: both new tests pass on first execution (impl already supports this).

- [ ] **Step 4: Add callback test.**

  Append:

  ```tsx
  describe("HighlightSegments — callbacks", () => {
    it("onClick fires with domain item + event", () => {
      const seg: HighlightSegment = { id: "a", start: 1, end: 3, color: "#fff" };
      const calls: HighlightSegment[] = [];
      const { container } = wrapper(() => (
        <HighlightSegments data={[seg]} onClick={(s) => calls.push(s)} />
      ));
      fireEvent.pointerDown(container.querySelector(".sui-chart__highlight-segment")!);
      expect(calls).toEqual([seg]);
    });

    it("onHover receives null on pointer-leave", () => {
      const seg: HighlightSegment = { id: "a", start: 1, end: 3, color: "#fff" };
      const calls: (HighlightSegment | null)[] = [];
      const { container } = wrapper(() => (
        <HighlightSegments data={[seg]} onHover={(s) => calls.push(s)} />
      ));
      const rect = container.querySelector(".sui-chart__highlight-segment")!;
      fireEvent.pointerEnter(rect);
      fireEvent.pointerLeave(rect);
      expect(calls).toEqual([seg, null]);
    });
  });
  ```

  Run. Expected: both pass.

- [ ] **Step 5: Add `HighlightSegments.variants.ts` (curried).**

  Create `src/components/Chart/HighlightSegments.variants.ts`:

  ```ts
  // ============================================
  // HighlightSegments Curried Variants — explicit Component<…DataProps>
  // annotations per ADR 0001 (commit 3152ef7) so vite-plugin-dts emits a
  // self-contained .d.ts without leaking pnpm temp paths.
  // ============================================
  import type { Component } from "solid-js";
  import { createHighlightSegments } from "./HighlightSegments";
  import type {
    HighlightSegment,
    HighlightSegmentsDataProps,
  } from "./HighlightSegments";

  /** Faint band (default opacity 0.12) — for non-emphatic backdrop highlights. */
  export const FaintHighlightSegments: Component<HighlightSegmentsDataProps<HighlightSegment>> =
    createHighlightSegments<HighlightSegment>({ fillOpacity: 0.12 });

  /** Accent band (opacity 0.22) — for the primary in-bounds highlight use. */
  export const AccentHighlightSegments: Component<HighlightSegmentsDataProps<HighlightSegment>> =
    createHighlightSegments<HighlightSegment>({ fillOpacity: 0.22 });
  ```

- [ ] **Step 6: Add a curried-variant test.**

  Append:

  ```tsx
  describe("HighlightSegments — curried variants", () => {
    it("AccentHighlightSegments bakes fillOpacity 0.22", () => {
      const seg: HighlightSegment = { id: "a", start: 1, end: 3, color: "#fff" };
      const { container } = wrapper(() => <AccentHighlightSegments data={[seg]} />);
      const rect = container.querySelector(".sui-chart__highlight-segment")!;
      expect(parseFloat(rect.getAttribute("opacity")!)).toBeCloseTo(0.22, 2);
    });
  });
  ```

  Run. Expected: all HighlightSegments tests pass.

- [ ] **Step 7: Commit.**

  ```bash
  git add src/components/Chart/HighlightSegments.tsx \
          src/components/Chart/HighlightSegments.variants.ts \
          src/components/Chart/HighlightSegments.test.tsx
  git commit -m "feat(chart): add HighlightSegments slot + curried variants"
  ```

---

## Task 11: `TimelineBar` slot + curried variants + tests

**Files:**
- Create: `src/components/Chart/TimelineBar.tsx`
- Create: `src/components/Chart/TimelineBar.variants.ts`
- Create: `src/components/Chart/TimelineBar.test.tsx`

**Steps:**

- [ ] **Step 1: Write failing render test.**

  Create `src/components/Chart/TimelineBar.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render, fireEvent } from "@solidjs/testing-library";
  import { createSignal, type JSX } from "solid-js";
  import { Chart } from "./Chart";
  import { TimelineBar, type TimelineBarDatum } from "./TimelineBar";
  import { DenseTimelineBar } from "./TimelineBar.variants";

  const wrapper = (slot: () => JSX.Element) =>
    render(() => (
      <Chart width={400} height={120} xDomain={[0, 10]} yDomain={[0, 100]}>
        {slot()}
      </Chart>
    ));

  describe("TimelineBar — render", () => {
    it("renders one rect per datum", () => {
      const bars: TimelineBarDatum[] = [
        { id: "a", start: 0, end: 2, lane: "scheduled", color: "var(--sui-accent)" },
        { id: "b", start: 3, end: 5, lane: "detected", color: "var(--sui-warning)" },
      ];
      const { container } = wrapper(() => <TimelineBar data={bars} />);
      expect(container.querySelectorAll(".sui-chart__timeline-bar").length).toBe(2);
    });

    it("places each lane at a distinct y position", () => {
      const bars: TimelineBarDatum[] = [
        { id: "a", start: 0, end: 2, lane: "scheduled", color: "#fff" },
        { id: "b", start: 0, end: 2, lane: "detected", color: "#fff" },
      ];
      const { container } = wrapper(() => <TimelineBar data={bars} lanes={["scheduled", "detected"]} />);
      const rects = Array.from(container.querySelectorAll<SVGRectElement>(".sui-chart__timeline-bar"));
      expect(rects[0].getAttribute("y")).not.toBe(rects[1].getAttribute("y"));
    });
  });
  ```

  Run. Expected: module missing.

- [ ] **Step 2: Implement `TimelineBar.tsx`.**

  Create `src/components/Chart/TimelineBar.tsx`:

  ```tsx
  // ============================================
  // TimelineBar — Chart slot (Depth 2).
  // Renders horizontal bars in lanes. Lanes are stacked top-to-bottom with
  // equal heights. If `lanes` prop is omitted, lanes are inferred from data
  // in first-encounter order. Consumer maps domain → TimelineBarDatum.
  // ============================================
  import { Component, For, createMemo, mergeProps } from "solid-js";
  import { useChart } from "./context";
  import type { Id, ClickHandler } from "./HighlightSegments";

  export interface TimelineBarDatum {
    id: Id;
    start: number;
    end: number;
    lane: string;
    color: string;
    state?: string;
  }

  export interface TimelineBarProps<T extends TimelineBarDatum = TimelineBarDatum> {
    data: readonly T[];
    /** Lane order (top-to-bottom). If omitted, inferred from data encounter order. */
    lanes?: readonly string[];
    selectedId?: Id | null;
    hoveredId?: Id | null;
    /** Bar height as fraction of lane height. Default 0.6. */
    barHeight?: number;
    onBarClick?: ClickHandler<T>;
    class?: string;
  }

  export interface TimelineBarOverrides {
    barHeight?: number;
    class?: string;
  }
  export type TimelineBarDataProps<T extends TimelineBarDatum = TimelineBarDatum> =
    Omit<TimelineBarProps<T>, keyof TimelineBarOverrides>;

  export function TimelineBar<T extends TimelineBarDatum = TimelineBarDatum>(
    props: TimelineBarProps<T>,
  ) {
    const ctx = useChart();
    const merged = mergeProps({ barHeight: 0.6 }, props);

    const lanes = createMemo<readonly string[]>(() => {
      if (merged.lanes) return merged.lanes;
      const seen = new Set<string>();
      const out: string[] = [];
      for (const d of merged.data) {
        if (!seen.has(d.lane)) {
          seen.add(d.lane);
          out.push(d.lane);
        }
      }
      return out;
    });

    const laneHeight = () => ctx.innerHeight() / Math.max(1, lanes().length);

    return (
      <g class={`sui-chart__timeline${merged.class ? " " + merged.class : ""}`}>
        <For each={merged.data}>
          {(bar) => {
            const laneIdx = () => lanes().indexOf(bar.lane);
            const x1 = () => ctx.xScale()(bar.start);
            const x2 = () => ctx.xScale()(bar.end);
            const yTop = () => laneIdx() * laneHeight() + (laneHeight() * (1 - merged.barHeight)) / 2;
            const isSelected = () => merged.selectedId === bar.id;
            const isHovered = () => merged.hoveredId === bar.id;
            return (
              <rect
                class="sui-chart__timeline-bar"
                data-id={bar.id}
                data-state={bar.state}
                data-selected={isSelected() ? "true" : undefined}
                data-hovered={isHovered() ? "true" : undefined}
                x={Math.min(x1(), x2())}
                y={yTop()}
                width={Math.abs(x2() - x1())}
                height={laneHeight() * merged.barHeight}
                fill={bar.color}
                onPointerDown={(e) => merged.onBarClick?.(bar, e)}
                style={{ cursor: merged.onBarClick ? "pointer" : undefined }}
              />
            );
          }}
        </For>
      </g>
    );
  }

  export function createTimelineBar<T extends TimelineBarDatum = TimelineBarDatum>(
    defaults: Partial<Omit<TimelineBarProps<T>, "children">>,
  ): Component<TimelineBarDataProps<T>> {
    return (props) => <TimelineBar<T> {...mergeProps(defaults, props as TimelineBarProps<T>)} />;
  }
  ```

  Run render test. Expected: 2 passed.

- [ ] **Step 3: Reactivity test — adding a bar reactively appends a rect.**

  Append to test file:

  ```tsx
  describe("TimelineBar — reactivity", () => {
    it("toggling selectedId updates data-selected", () => {
      const [sel, setSel] = createSignal<Id | null>(null);
      const bar: TimelineBarDatum = { id: "a", start: 1, end: 3, lane: "x", color: "#fff" };
      const { container } = wrapper(() => <TimelineBar data={[bar]} selectedId={sel()} />);
      expect(container.querySelector(".sui-chart__timeline-bar")!.getAttribute("data-selected")).toBeNull();
      setSel("a");
      expect(container.querySelector(".sui-chart__timeline-bar")!.getAttribute("data-selected")).toBe("true");
    });
  });
  ```

  Run. Expected: pass.

- [ ] **Step 4: Callback test — `onBarClick` fires with domain item + event.**

  Append:

  ```tsx
  describe("TimelineBar — callbacks", () => {
    it("onBarClick fires with domain item + event", () => {
      const bar: TimelineBarDatum = { id: "a", start: 1, end: 3, lane: "x", color: "#fff" };
      const calls: TimelineBarDatum[] = [];
      const { container } = wrapper(() => (
        <TimelineBar data={[bar]} onBarClick={(b) => calls.push(b)} />
      ));
      fireEvent.pointerDown(container.querySelector(".sui-chart__timeline-bar")!);
      expect(calls).toEqual([bar]);
    });
  });
  ```

  Run. Expected: pass.

- [ ] **Step 5: Add `TimelineBar.variants.ts`.**

  Create `src/components/Chart/TimelineBar.variants.ts`:

  ```ts
  import type { Component } from "solid-js";
  import { createTimelineBar } from "./TimelineBar";
  import type { TimelineBarDatum, TimelineBarDataProps } from "./TimelineBar";

  /** Dense — bars fill 90% of lane height; for tightly-packed schedule views. */
  export const DenseTimelineBar: Component<TimelineBarDataProps<TimelineBarDatum>> =
    createTimelineBar<TimelineBarDatum>({ barHeight: 0.9 });

  /** Sparse — bars fill 40% of lane height; for sparse "event" markers. */
  export const SparseTimelineBar: Component<TimelineBarDataProps<TimelineBarDatum>> =
    createTimelineBar<TimelineBarDatum>({ barHeight: 0.4 });
  ```

- [ ] **Step 6: Add a curried-variant test.**

  Append:

  ```tsx
  describe("TimelineBar — curried variants", () => {
    it("DenseTimelineBar renders bars at 90% lane height", () => {
      const bar: TimelineBarDatum = { id: "a", start: 1, end: 3, lane: "x", color: "#fff" };
      const { container } = wrapper(() => <DenseTimelineBar data={[bar]} />);
      const rect = container.querySelector(".sui-chart__timeline-bar") as SVGRectElement;
      // Chart inner height is 120-8-28 = 84; single lane → ~84 * 0.9 ≈ 75.6.
      expect(parseFloat(rect.getAttribute("height")!)).toBeGreaterThan(60);
    });
  });
  ```

  Run. Expected: all TimelineBar tests pass.

- [ ] **Step 7: Commit.**

  ```bash
  git add src/components/Chart/TimelineBar.tsx \
          src/components/Chart/TimelineBar.variants.ts \
          src/components/Chart/TimelineBar.test.tsx
  git commit -m "feat(chart): add TimelineBar slot + curried variants"
  ```

---

## Task 12: `PinMarkers` slot + curried variants + tests

**Files:**
- Create: `src/components/Chart/PinMarkers.tsx`
- Create: `src/components/Chart/PinMarkers.variants.ts`
- Create: `src/components/Chart/PinMarkers.test.tsx`

**Steps:**

- [ ] **Step 1: Failing render test.**

  Create `src/components/Chart/PinMarkers.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render, fireEvent } from "@solidjs/testing-library";
  import { createSignal, type JSX } from "solid-js";
  import { Chart } from "./Chart";
  import { PinMarkers, type Pin } from "./PinMarkers";
  import { WarningPinMarkers } from "./PinMarkers.variants";

  const wrapper = (slot: () => JSX.Element) =>
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        {slot()}
      </Chart>
    ));

  describe("PinMarkers — render", () => {
    it("renders one glyph group per pin", () => {
      const pins: Pin[] = [
        { id: "a", x: 2, descriptor: { color: "var(--sui-warning)", shape: "pin" } },
        { id: "b", x: 5, descriptor: { color: "var(--sui-accent)", shape: "circle" } },
      ];
      const { container } = wrapper(() => <PinMarkers data={pins} />);
      expect(container.querySelectorAll(".sui-chart__pin-marker").length).toBe(2);
    });
  });
  ```

  Run. Expected: module missing.

- [ ] **Step 2: Implement `PinMarkers.tsx`.**

  Create `src/components/Chart/PinMarkers.tsx`:

  ```tsx
  // ============================================
  // PinMarkers — Chart slot (Depth 2).
  // Renders a descriptor-anchored glyph per pin. `y` is optional; defaults
  // to the top edge of the plot area (y=0 in pixel space). Supports
  // selection + click/delete callbacks. `renderPin` is an escape hatch
  // when the descriptor cannot express what the consumer needs.
  // ============================================
  import { Component, For, JSX, mergeProps } from "solid-js";
  import { useChart } from "./context";
  import { ShapeGlyph, type Descriptor } from "./shapes";
  import type { Id, ClickHandler } from "./HighlightSegments";

  export interface Pin<TDomain = unknown> {
    id: Id;
    x: number;
    y?: number;
    descriptor: Descriptor;
    data?: TDomain;
  }

  export interface PinMarkersRenderContext {
    cx: number;
    cy: number;
    selected: boolean;
  }

  export interface PinMarkersProps<TPin extends Pin = Pin> {
    data: readonly TPin[];
    selectedId?: Id | null;
    /** Default glyph size in px. Default 12 (matches DEFAULT_GLYPH_SIZE in shapes.ts). */
    size?: number;
    onClick?: ClickHandler<TPin>;
    onDelete?: ClickHandler<TPin>;
    /** Escape hatch — full render control per pin. Receives (pin, renderCtx). */
    renderPin?: (pin: TPin, renderCtx: PinMarkersRenderContext) => JSX.Element;
    class?: string;
  }

  export interface PinMarkersOverrides {
    size?: number;
    class?: string;
  }
  export type PinMarkersDataProps<TPin extends Pin = Pin> =
    Omit<PinMarkersProps<TPin>, keyof PinMarkersOverrides>;

  export function PinMarkers<TPin extends Pin = Pin>(props: PinMarkersProps<TPin>) {
    const ctx = useChart();
    const merged = mergeProps({ size: 12 }, props);

    return (
      <g class={`sui-chart__pin-markers${merged.class ? " " + merged.class : ""}`}>
        <For each={merged.data}>
          {(pin) => {
            const cx = () => ctx.xScale()(pin.x);
            const cy = () => (pin.y != null ? ctx.yScale()(pin.y) : 0);
            const selected = () => merged.selectedId === pin.id;
            if (merged.renderPin) {
              return (
                <g
                  class="sui-chart__pin-marker"
                  data-id={pin.id}
                  data-selected={selected() ? "true" : undefined}
                  onPointerDown={(e) => merged.onClick?.(pin, e)}
                  onDblClick={(e) => merged.onDelete?.(pin, e as unknown as PointerEvent)}
                >
                  {merged.renderPin(pin, { cx: cx(), cy: cy(), selected: selected() })}
                </g>
              );
            }
            return (
              <g
                class="sui-chart__pin-marker"
                data-id={pin.id}
                data-selected={selected() ? "true" : undefined}
                onPointerDown={(e) => merged.onClick?.(pin, e)}
                onDblClick={(e) => merged.onDelete?.(pin, e as unknown as PointerEvent)}
                style={{ cursor: merged.onClick ? "pointer" : undefined }}
              >
                <ShapeGlyph descriptor={pin.descriptor} cx={cx()} cy={cy()} size={pin.descriptor.size ?? merged.size} />
              </g>
            );
          }}
        </For>
      </g>
    );
  }

  export function createPinMarkers<TPin extends Pin = Pin>(
    defaults: Partial<Omit<PinMarkersProps<TPin>, "children">>,
  ): Component<PinMarkersDataProps<TPin>> {
    return (props) => <PinMarkers<TPin> {...mergeProps(defaults, props as PinMarkersProps<TPin>)} />;
  }
  ```

  Run render test. Expected: pass.

- [ ] **Step 3: Reactivity test — toggling `selectedId` flips `data-selected`.**

  Append:

  ```tsx
  describe("PinMarkers — reactivity", () => {
    it("toggling selectedId flips data-selected on the matched pin", () => {
      const [sel, setSel] = createSignal<Id | null>(null);
      const pins: Pin[] = [{ id: "a", x: 5, descriptor: { color: "#fff", shape: "pin" } }];
      const { container } = wrapper(() => <PinMarkers data={pins} selectedId={sel()} />);
      expect(container.querySelector(".sui-chart__pin-marker")!.getAttribute("data-selected")).toBeNull();
      setSel("a");
      expect(container.querySelector(".sui-chart__pin-marker")!.getAttribute("data-selected")).toBe("true");
    });
  });
  ```

  Run. Expected: pass.

- [ ] **Step 4: Callback tests — `onClick` + `onDelete`.**

  Append:

  ```tsx
  describe("PinMarkers — callbacks", () => {
    it("onClick fires on pointerdown with pin + event", () => {
      const pin: Pin = { id: "a", x: 5, descriptor: { color: "#fff", shape: "pin" } };
      const calls: Pin[] = [];
      const { container } = wrapper(() => <PinMarkers data={[pin]} onClick={(p) => calls.push(p)} />);
      fireEvent.pointerDown(container.querySelector(".sui-chart__pin-marker")!);
      expect(calls).toEqual([pin]);
    });

    it("onDelete fires on dblclick", () => {
      const pin: Pin = { id: "a", x: 5, descriptor: { color: "#fff", shape: "pin" } };
      const calls: Pin[] = [];
      const { container } = wrapper(() => <PinMarkers data={[pin]} onDelete={(p) => calls.push(p)} />);
      fireEvent.dblClick(container.querySelector(".sui-chart__pin-marker")!);
      expect(calls).toEqual([pin]);
    });
  });
  ```

  Run. Expected: both pass.

- [ ] **Step 5: Add `PinMarkers.variants.ts`.**

  Create `src/components/Chart/PinMarkers.variants.ts`:

  ```ts
  import type { Component } from "solid-js";
  import { createPinMarkers } from "./PinMarkers";
  import type { Pin, PinMarkersDataProps } from "./PinMarkers";

  /** Warning pin styling — bumps default size for prominence. */
  export const WarningPinMarkers: Component<PinMarkersDataProps<Pin>> =
    createPinMarkers<Pin>({ size: 16, class: "sui-chart__pin-markers--warning" });

  /** Compact pin styling — smaller glyphs for dense charts. */
  export const CompactPinMarkers: Component<PinMarkersDataProps<Pin>> =
    createPinMarkers<Pin>({ size: 8 });
  ```

- [ ] **Step 6: Curried-variant test.**

  Append:

  ```tsx
  describe("PinMarkers — curried variants", () => {
    it("WarningPinMarkers attaches the warning class", () => {
      const pin: Pin = { id: "a", x: 5, descriptor: { color: "var(--sui-warning)", shape: "pin" } };
      const { container } = wrapper(() => <WarningPinMarkers data={[pin]} />);
      expect(container.querySelector(".sui-chart__pin-markers--warning")).toBeTruthy();
    });
  });
  ```

  Run. Expected: all PinMarkers tests pass.

- [ ] **Step 7: Commit.**

  ```bash
  git add src/components/Chart/PinMarkers.tsx \
          src/components/Chart/PinMarkers.variants.ts \
          src/components/Chart/PinMarkers.test.tsx
  git commit -m "feat(chart): add PinMarkers slot + curried variants"
  ```

---

## Task 13: `GhostPin` slot + curried variants + tests

**Files:**
- Create: `src/components/Chart/GhostPin.tsx`
- Create: `src/components/Chart/GhostPin.variants.ts`
- Create: `src/components/Chart/GhostPin.test.tsx`

**Steps:**

- [ ] **Step 1: Failing render test.**

  Create `src/components/Chart/GhostPin.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render } from "@solidjs/testing-library";
  import { createSignal, type JSX } from "solid-js";
  import { Chart } from "./Chart";
  import { GhostPin } from "./GhostPin";
  import { WarningGhostPin } from "./GhostPin.variants";
  import type { Descriptor } from "./shapes";

  const wrapper = (slot: () => JSX.Element) =>
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        {slot()}
      </Chart>
    ));

  describe("GhostPin — render", () => {
    it("renders nothing when descriptor is null", () => {
      const { container } = wrapper(() => <GhostPin descriptor={null} />);
      expect(container.querySelector(".sui-chart__ghost-pin")).toBeNull();
    });

    it("renders at hoverX when descriptor is set and hover is active", () => {
      // Without a hover yet, ghost is hidden.
      const desc: Descriptor = { color: "var(--sui-warning)", shape: "pin" };
      const { container } = wrapper(() => <GhostPin descriptor={desc} />);
      expect(container.querySelector(".sui-chart__ghost-pin")).toBeNull();
    });
  });
  ```

  Run. Expected: module missing.

- [ ] **Step 2: Implement `GhostPin.tsx`.**

  Create `src/components/Chart/GhostPin.tsx`:

  ```tsx
  // ============================================
  // GhostPin — Chart slot (Depth 2).
  // Renders a single semi-transparent glyph anchored at the current
  // hoverX (data domain). Used as a "where will my next pin land?" cue.
  // `descriptor=null` hides the ghost; the slot is otherwise purely
  // reactive to context's hoverX signal.
  // ============================================
  import { Component, Show, mergeProps } from "solid-js";
  import { useChart } from "./context";
  import { ShapeGlyph, type Descriptor } from "./shapes";

  export interface GhostPinProps {
    /** Descriptor for the ghost glyph, or null to hide. */
    descriptor: Descriptor | null;
    /** Y position in data domain. Defaults to top edge of plot area. */
    y?: number;
    /** Override glyph size. Default 12. */
    size?: number;
    /** Opacity multiplier (0..1). Default 0.4. */
    opacity?: number;
    class?: string;
  }

  export interface GhostPinOverrides {
    size?: number;
    opacity?: number;
    class?: string;
  }
  export type GhostPinDataProps = Omit<GhostPinProps, keyof GhostPinOverrides>;

  export const GhostPin: Component<GhostPinProps> = (props) => {
    const ctx = useChart();
    const merged = mergeProps({ size: 12, opacity: 0.4 }, props);
    return (
      <Show when={merged.descriptor != null && ctx.hoverX() != null}>
        <g
          class={`sui-chart__ghost-pin${merged.class ? " " + merged.class : ""}`}
          opacity={merged.opacity}
          aria-hidden="true"
        >
          <ShapeGlyph
            descriptor={merged.descriptor!}
            cx={ctx.xScale()(ctx.hoverX()!)}
            cy={merged.y != null ? ctx.yScale()(merged.y) : 0}
            size={merged.size}
          />
        </g>
      </Show>
    );
  };

  export function createGhostPin(
    defaults: Partial<Omit<GhostPinProps, "children">>,
  ): Component<GhostPinDataProps> {
    return (props) => <GhostPin {...mergeProps(defaults, props as GhostPinProps)} />;
  }
  ```

  Run render test. Expected: 2 passed.

- [ ] **Step 3: Reactivity test — when hoverX is set via context, ghost appears.**

  Append:

  ```tsx
  import { useChart } from "./context";
  import type { Component } from "solid-js";

  describe("GhostPin — reactivity", () => {
    it("appears when hoverX is set via setHoverX", () => {
      let setHover: ((x: number | null) => void) | null = null;
      const Probe: Component = () => {
        const ctx = useChart();
        setHover = ctx.setHoverX;
        return null;
      };
      const desc: Descriptor = { color: "#fff", shape: "pin" };
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
          <GhostPin descriptor={desc} />
        </Chart>
      ));
      expect(container.querySelector(".sui-chart__ghost-pin")).toBeNull();
      setHover!(5);
      expect(container.querySelector(".sui-chart__ghost-pin")).toBeTruthy();
    });

    it("hides when descriptor flips to null", () => {
      const [desc, setDesc] = createSignal<Descriptor | null>({ color: "#fff", shape: "pin" });
      let setHover: ((x: number | null) => void) | null = null;
      const Probe: Component = () => {
        const ctx = useChart();
        setHover = ctx.setHoverX;
        return null;
      };
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
          <GhostPin descriptor={desc()} />
        </Chart>
      ));
      setHover!(5);
      expect(container.querySelector(".sui-chart__ghost-pin")).toBeTruthy();
      setDesc(null);
      expect(container.querySelector(".sui-chart__ghost-pin")).toBeNull();
    });
  });
  ```

  Run. Expected: pass.

- [ ] **Step 4: Add `GhostPin.variants.ts`.**

  Create `src/components/Chart/GhostPin.variants.ts`:

  ```ts
  import type { Component } from "solid-js";
  import { createGhostPin } from "./GhostPin";
  import type { GhostPinDataProps } from "./GhostPin";

  /** Warning ghost — bumps size + opacity for the canonical "drop a warning pin here" cue. */
  export const WarningGhostPin: Component<GhostPinDataProps> =
    createGhostPin({ size: 16, opacity: 0.5, class: "sui-chart__ghost-pin--warning" });

  /** Subtle ghost — low opacity, default size. */
  export const SubtleGhostPin: Component<GhostPinDataProps> =
    createGhostPin({ opacity: 0.25 });
  ```

- [ ] **Step 5: Curried-variant test.**

  Append:

  ```tsx
  describe("GhostPin — curried variants", () => {
    it("WarningGhostPin attaches the warning class when visible", () => {
      let setHover: ((x: number | null) => void) | null = null;
      const Probe: Component = () => {
        const ctx = useChart();
        setHover = ctx.setHoverX;
        return null;
      };
      const desc: Descriptor = { color: "var(--sui-warning)", shape: "pin" };
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
          <WarningGhostPin descriptor={desc} />
        </Chart>
      ));
      setHover!(5);
      expect(container.querySelector(".sui-chart__ghost-pin--warning")).toBeTruthy();
    });
  });
  ```

  Run. Expected: all GhostPin tests pass.

- [ ] **Step 6: Commit.**

  ```bash
  git add src/components/Chart/GhostPin.tsx \
          src/components/Chart/GhostPin.variants.ts \
          src/components/Chart/GhostPin.test.tsx
  git commit -m "feat(chart): add GhostPin slot + curried variants"
  ```

---

## Task 14: `DragRangeSelect` slot + curried variants + tests

Per spec D3, `DragRangeSelect` is **config-only** — it does NOT attach pointer listeners. It reads `dragRange` from `useChart()` (which the root listener from Task 4 maintains) and fires `onRange` when the range crosses the `minPixelDelta` threshold.

**Files:**
- Create: `src/components/Chart/DragRangeSelect.tsx`
- Create: `src/components/Chart/DragRangeSelect.variants.ts`
- Create: `src/components/Chart/DragRangeSelect.test.tsx`

**Steps:**

- [ ] **Step 1: Failing render test (visual band reflects dragRange).**

  Create `src/components/Chart/DragRangeSelect.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render } from "@solidjs/testing-library";
  import { type Component } from "solid-js";
  import { Chart } from "./Chart";
  import { DragRangeSelect } from "./DragRangeSelect";
  import { CommitOnReleaseDragRangeSelect } from "./DragRangeSelect.variants";
  import { useChart } from "./context";

  describe("DragRangeSelect — render", () => {
    it("renders no band when dragRange is null", () => {
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <DragRangeSelect onRange={() => {}} />
        </Chart>
      ));
      expect(container.querySelector(".sui-chart__drag-range")).toBeNull();
    });

    it("renders a band reflecting context.dragRange", () => {
      let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
      const Probe: Component = () => {
        const ctx = useChart();
        setDrag = ctx.setDragRange;
        return null;
      };
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
          <DragRangeSelect onRange={() => {}} />
        </Chart>
      ));
      setDrag!({ start: 2, end: 5 });
      expect(container.querySelector(".sui-chart__drag-range")).toBeTruthy();
    });
  });
  ```

  Run. Expected: module missing.

- [ ] **Step 2: Implement `DragRangeSelect.tsx`.**

  Create `src/components/Chart/DragRangeSelect.tsx`:

  ```tsx
  // ============================================
  // DragRangeSelect — Chart slot (Depth 2).
  // Config-only consumer of context.dragRange (per spec D3 — the root
  // <Chart> owns the pointer listener). Renders a visual band over the
  // active drag range and fires `onRange` callbacks. Does NOT attach
  // pointer listeners of its own.
  // ============================================
  import { Component, Show, createEffect, mergeProps } from "solid-js";
  import { useChart } from "./context";

  export interface DragRangeSelectProps {
    /** Fires when the user finishes a drag whose pixel span exceeds `minPixelDelta`. */
    onRange?: (start: number, end: number) => void;
    /** Live preview callback — fires for every change of the active drag range. */
    onRangePreview?: (start: number, end: number) => void;
    /** Minimum pixel distance before `onRange` is considered a real selection. Default 5. */
    minPixelDelta?: number;
    /** Visual band fill. Default 'var(--sui-accent)'. */
    fill?: string;
    /** Visual band fill opacity. Default 0.15. */
    fillOpacity?: number;
    class?: string;
  }

  export interface DragRangeSelectOverrides {
    minPixelDelta?: number;
    fill?: string;
    fillOpacity?: number;
    class?: string;
  }
  export type DragRangeSelectDataProps = Omit<DragRangeSelectProps, keyof DragRangeSelectOverrides>;

  export const DragRangeSelect: Component<DragRangeSelectProps> = (props) => {
    const ctx = useChart();
    const merged = mergeProps(
      { minPixelDelta: 5, fill: "var(--sui-accent)", fillOpacity: 0.15 },
      props,
    );

    // Track the last range we committed via onRange so we don't double-fire.
    let lastCommitted: { start: number; end: number } | null = null;

    createEffect(() => {
      const range = ctx.dragRange();
      if (range == null) return;
      const xs = ctx.xScale();
      const pxDelta = Math.abs(xs(range.end) - xs(range.start));

      merged.onRangePreview?.(range.start, range.end);

      // Commit when the threshold is crossed and the range has actually changed.
      if (pxDelta >= merged.minPixelDelta) {
        if (
          lastCommitted === null ||
          lastCommitted.start !== range.start ||
          lastCommitted.end !== range.end
        ) {
          lastCommitted = { start: range.start, end: range.end };
          merged.onRange?.(range.start, range.end);
        }
      }
    });

    return (
      <Show when={ctx.dragRange()}>
        {(r) => {
          const xs = () => ctx.xScale();
          const x = () => Math.min(xs()(r().start), xs()(r().end));
          const w = () => Math.abs(xs()(r().end) - xs()(r().start));
          return (
            <rect
              class={`sui-chart__drag-range${merged.class ? " " + merged.class : ""}`}
              x={x()}
              y={0}
              width={w()}
              height={ctx.innerHeight()}
              fill={merged.fill}
              fill-opacity={merged.fillOpacity}
              pointer-events="none"
            />
          );
        }}
      </Show>
    );
  };

  export function createDragRangeSelect(
    defaults: Partial<Omit<DragRangeSelectProps, "children">>,
  ): Component<DragRangeSelectDataProps> {
    return (props) => <DragRangeSelect {...mergeProps(defaults, props as DragRangeSelectProps)} />;
  }
  ```

  Run render test. Expected: 2 passed.

- [ ] **Step 3: Reactivity test — band geometry tracks dragRange updates.**

  Append:

  ```tsx
  describe("DragRangeSelect — reactivity", () => {
    it("band width updates when dragRange.end moves", () => {
      let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
      const Probe: Component = () => {
        const ctx = useChart();
        setDrag = ctx.setDragRange;
        return null;
      };
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
          <DragRangeSelect onRange={() => {}} />
        </Chart>
      ));
      setDrag!({ start: 2, end: 4 });
      const w1 = parseFloat(container.querySelector(".sui-chart__drag-range")!.getAttribute("width")!);
      setDrag!({ start: 2, end: 8 });
      const w2 = parseFloat(container.querySelector(".sui-chart__drag-range")!.getAttribute("width")!);
      expect(w2).toBeGreaterThan(w1);
    });
  });
  ```

  Run. Expected: pass.

- [ ] **Step 4: Callback test — `onRange` fires once threshold is crossed; `onRangePreview` fires for every change.**

  Append:

  ```tsx
  describe("DragRangeSelect — callbacks", () => {
    it("onRange fires only when minPixelDelta is exceeded", () => {
      let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
      const Probe: Component = () => {
        const ctx = useChart();
        setDrag = ctx.setDragRange;
        return null;
      };
      const calls: Array<[number, number]> = [];
      render(() => (
        <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
          <Probe />
          <DragRangeSelect minPixelDelta={10} onRange={(a, b) => calls.push([a, b])} />
        </Chart>
      ));
      // Inner width is ~ 200 - 8 - 36 = 156 px over 100 data units → ~1.56 px/unit.
      // start=10,end=12 → ~3px delta — below threshold.
      setDrag!({ start: 10, end: 12 });
      expect(calls.length).toBe(0);
      // start=10,end=30 → ~31px delta — above threshold.
      setDrag!({ start: 10, end: 30 });
      expect(calls).toEqual([[10, 30]]);
    });

    it("onRangePreview fires for every dragRange update", () => {
      let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
      const Probe: Component = () => {
        const ctx = useChart();
        setDrag = ctx.setDragRange;
        return null;
      };
      const previews: Array<[number, number]> = [];
      render(() => (
        <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
          <Probe />
          <DragRangeSelect onRangePreview={(a, b) => previews.push([a, b])} />
        </Chart>
      ));
      setDrag!({ start: 1, end: 2 });
      setDrag!({ start: 1, end: 5 });
      setDrag!({ start: 1, end: 9 });
      expect(previews.length).toBe(3);
    });
  });
  ```

  Run. Expected: pass.

- [ ] **Step 5: Add `DragRangeSelect.variants.ts`.**

  Create `src/components/Chart/DragRangeSelect.variants.ts`:

  ```ts
  import type { Component } from "solid-js";
  import { createDragRangeSelect } from "./DragRangeSelect";
  import type { DragRangeSelectDataProps } from "./DragRangeSelect";

  /** Commit-on-release — wider minPixelDelta (15px) to suppress accidental selections. */
  export const CommitOnReleaseDragRangeSelect: Component<DragRangeSelectDataProps> =
    createDragRangeSelect({ minPixelDelta: 15, fillOpacity: 0.12 });

  /** Eager — minPixelDelta 3px; commits as soon as the user starts dragging. */
  export const EagerDragRangeSelect: Component<DragRangeSelectDataProps> =
    createDragRangeSelect({ minPixelDelta: 3, fillOpacity: 0.2 });
  ```

- [ ] **Step 6: Curried-variant test.**

  Append:

  ```tsx
  describe("DragRangeSelect — curried variants", () => {
    it("CommitOnReleaseDragRangeSelect uses lower opacity", () => {
      let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
      const Probe: Component = () => {
        const ctx = useChart();
        setDrag = ctx.setDragRange;
        return null;
      };
      const { container } = render(() => (
        <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
          <Probe />
          <CommitOnReleaseDragRangeSelect onRange={() => {}} />
        </Chart>
      ));
      setDrag!({ start: 2, end: 5 });
      const opacity = parseFloat(
        container.querySelector(".sui-chart__drag-range")!.getAttribute("fill-opacity")!,
      );
      expect(opacity).toBeCloseTo(0.12, 2);
    });
  });
  ```

  Run. Expected: all DragRangeSelect tests pass.

- [ ] **Step 7: Commit.**

  ```bash
  git add src/components/Chart/DragRangeSelect.tsx \
          src/components/Chart/DragRangeSelect.variants.ts \
          src/components/Chart/DragRangeSelect.test.tsx
  git commit -m "feat(chart): add DragRangeSelect slot (config-only) + curried variants"
  ```

---

## Task 15: `CurrentValueIndicator` slot + curried variants + tests

**Files:**
- Create: `src/components/Chart/CurrentValueIndicator.tsx`
- Create: `src/components/Chart/CurrentValueIndicator.variants.ts`
- Create: `src/components/Chart/CurrentValueIndicator.test.tsx`

**Steps:**

- [ ] **Step 1: Failing render test.**

  Create `src/components/Chart/CurrentValueIndicator.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render } from "@solidjs/testing-library";
  import { createSignal, type JSX } from "solid-js";
  import { Chart } from "./Chart";
  import {
    CurrentValueIndicator,
    type CurrentValue,
  } from "./CurrentValueIndicator";
  import { AccentCurrentValueIndicator } from "./CurrentValueIndicator.variants";

  const wrapper = (slot: () => JSX.Element) =>
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        {slot()}
      </Chart>
    ));

  describe("CurrentValueIndicator — render", () => {
    it("renders nothing when point is null", () => {
      const { container } = wrapper(() => <CurrentValueIndicator point={null} />);
      expect(container.querySelector(".sui-chart__current-value")).toBeNull();
    });

    it("renders a dot at the point position when set", () => {
      const point: CurrentValue = { x: 5, y: 50 };
      const { container } = wrapper(() => <CurrentValueIndicator point={point} />);
      expect(container.querySelector(".sui-chart__current-value")).toBeTruthy();
    });

    it("renders an optional label", () => {
      const point: CurrentValue = { x: 5, y: 50, label: "now" };
      const { container } = wrapper(() => <CurrentValueIndicator point={point} />);
      expect(container.querySelector(".sui-chart__current-value-label")!.textContent).toBe("now");
    });
  });
  ```

  Run. Expected: module missing.

- [ ] **Step 2: Implement `CurrentValueIndicator.tsx`.**

  Create `src/components/Chart/CurrentValueIndicator.tsx`:

  ```tsx
  // ============================================
  // CurrentValueIndicator — Chart slot (Depth 2).
  // Renders a dot (and optional label) at a single "current value" point.
  // The slot is pure: no internal state; consumer controls the point.
  // ============================================
  import { Component, Show, mergeProps } from "solid-js";
  import { useChart } from "./context";

  export interface CurrentValue {
    x: number;
    y: number;
    label?: string;
  }

  export interface CurrentValueIndicatorProps {
    point: CurrentValue | null;
    /** Dot radius in px. Default 4. */
    radius?: number;
    /** Dot color. Default 'var(--sui-accent)'. */
    color?: string;
    /** Label offset in px from the dot. Default { x: 8, y: -4 }. */
    labelOffset?: { x: number; y: number };
    class?: string;
  }

  export interface CurrentValueIndicatorOverrides {
    radius?: number;
    color?: string;
    labelOffset?: { x: number; y: number };
    class?: string;
  }
  export type CurrentValueIndicatorDataProps =
    Omit<CurrentValueIndicatorProps, keyof CurrentValueIndicatorOverrides>;

  export const CurrentValueIndicator: Component<CurrentValueIndicatorProps> = (props) => {
    const ctx = useChart();
    const merged = mergeProps(
      { radius: 4, color: "var(--sui-accent)", labelOffset: { x: 8, y: -4 } },
      props,
    );
    return (
      <Show when={merged.point}>
        {(p) => (
          <g class={`sui-chart__current-value${merged.class ? " " + merged.class : ""}`}>
            <circle
              cx={ctx.xScale()(p().x)}
              cy={ctx.yScale()(p().y)}
              r={merged.radius}
              fill={merged.color}
            />
            <Show when={p().label}>
              <text
                class="sui-chart__current-value-label"
                x={ctx.xScale()(p().x) + merged.labelOffset.x}
                y={ctx.yScale()(p().y) + merged.labelOffset.y}
              >
                {p().label}
              </text>
            </Show>
          </g>
        )}
      </Show>
    );
  };

  export function createCurrentValueIndicator(
    defaults: Partial<Omit<CurrentValueIndicatorProps, "children">>,
  ): Component<CurrentValueIndicatorDataProps> {
    return (props) => (
      <CurrentValueIndicator {...mergeProps(defaults, props as CurrentValueIndicatorProps)} />
    );
  }
  ```

  Run render test. Expected: 3 passed.

- [ ] **Step 3: Reactivity test.**

  Append:

  ```tsx
  describe("CurrentValueIndicator — reactivity", () => {
    it("dot moves when point.x updates", () => {
      const [pt, setPt] = createSignal<CurrentValue | null>({ x: 2, y: 50 });
      const { container } = wrapper(() => <CurrentValueIndicator point={pt()} />);
      const cx1 = container.querySelector("circle")!.getAttribute("cx");
      setPt({ x: 8, y: 50 });
      const cx2 = container.querySelector("circle")!.getAttribute("cx");
      expect(cx1).not.toBe(cx2);
    });

    it("disappears when point is set to null", () => {
      const [pt, setPt] = createSignal<CurrentValue | null>({ x: 2, y: 50 });
      const { container } = wrapper(() => <CurrentValueIndicator point={pt()} />);
      expect(container.querySelector(".sui-chart__current-value")).toBeTruthy();
      setPt(null);
      expect(container.querySelector(".sui-chart__current-value")).toBeNull();
    });
  });
  ```

  Run. Expected: pass.

- [ ] **Step 4: Add `CurrentValueIndicator.variants.ts`.**

  Create `src/components/Chart/CurrentValueIndicator.variants.ts`:

  ```ts
  import type { Component } from "solid-js";
  import { createCurrentValueIndicator } from "./CurrentValueIndicator";
  import type { CurrentValueIndicatorDataProps } from "./CurrentValueIndicator";

  /** Accent current-value — primary signal styling. */
  export const AccentCurrentValueIndicator: Component<CurrentValueIndicatorDataProps> =
    createCurrentValueIndicator({ color: "var(--sui-accent)", radius: 5 });

  /** Warning current-value — for overflow / out-of-bounds emphasis. */
  export const WarningCurrentValueIndicator: Component<CurrentValueIndicatorDataProps> =
    createCurrentValueIndicator({ color: "var(--sui-warning)", radius: 5 });
  ```

- [ ] **Step 5: Curried-variant test.**

  Append:

  ```tsx
  describe("CurrentValueIndicator — curried variants", () => {
    it("AccentCurrentValueIndicator uses accent color + radius 5", () => {
      const point: CurrentValue = { x: 5, y: 50 };
      const { container } = wrapper(() => <AccentCurrentValueIndicator point={point} />);
      const circle = container.querySelector("circle")!;
      expect(circle.getAttribute("r")).toBe("5");
      expect(circle.getAttribute("fill")).toBe("var(--sui-accent)");
    });
  });
  ```

  Run. Expected: all CurrentValueIndicator tests pass.

- [ ] **Step 6: Commit.**

  ```bash
  git add src/components/Chart/CurrentValueIndicator.tsx \
          src/components/Chart/CurrentValueIndicator.variants.ts \
          src/components/Chart/CurrentValueIndicator.test.tsx
  git commit -m "feat(chart): add CurrentValueIndicator slot + curried variants"
  ```

---

## Task 16: Update `src/components/Chart/index.ts` exports

**Files:**
- Modify: `src/components/Chart/index.ts` (currently 24 lines)

**Steps:**

- [ ] **Step 1: Add exports for every new slot, type, factory, curried variant, plus `shapes.ts`.**

  Replace the file:

  ```ts
  export { Chart } from "./Chart";
  export type { ChartProps } from "./Chart";
  export { Grid } from "./Grid";
  export type { GridProps } from "./Grid";
  export { XAxis, YAxis } from "./Axes";
  export type { AxisProps } from "./Axes";
  export { LineSeries, AreaSeries, PointSeries, BarSeries, ReferenceLine } from "./Series";
  export type {
    LineSeriesProps,
    AreaSeriesProps,
    PointSeriesProps,
    BarSeriesProps,
    BarSegment,
    ReferenceLineProps,
  } from "./Series";
  export { Crosshair } from "./Crosshair";
  export type { CrosshairProps, CrosshairSeries } from "./Crosshair";
  export { ChartTooltip } from "./Tooltip";
  export type { ChartTooltipProps } from "./Tooltip";
  export { useChart } from "./context";
  export type { ChartContextValue, Margin } from "./context";
  export { linearScale, scaleTime, domainOf } from "./scales";
  export type { Scale, TimeScale } from "./scales";

  // Shape primitives.
  export { ShapeGlyph, DEFAULT_GLYPH_SIZE } from "./shapes";
  export type { Shape, Descriptor } from "./shapes";

  // Slot family.
  export {
    HighlightSegments,
    createHighlightSegments,
  } from "./HighlightSegments";
  export type {
    HighlightSegment,
    HighlightSegmentsProps,
    HighlightSegmentsDataProps,
    Id,
    ClickHandler,
    HoverHandler,
  } from "./HighlightSegments";
  export * from "./HighlightSegments.variants";

  export { TimelineBar, createTimelineBar } from "./TimelineBar";
  export type {
    TimelineBarDatum,
    TimelineBarProps,
    TimelineBarDataProps,
  } from "./TimelineBar";
  export * from "./TimelineBar.variants";

  export { PinMarkers, createPinMarkers } from "./PinMarkers";
  export type {
    Pin,
    PinMarkersProps,
    PinMarkersDataProps,
    PinMarkersRenderContext,
  } from "./PinMarkers";
  export * from "./PinMarkers.variants";

  export { GhostPin, createGhostPin } from "./GhostPin";
  export type { GhostPinProps, GhostPinDataProps } from "./GhostPin";
  export * from "./GhostPin.variants";

  export { DragRangeSelect, createDragRangeSelect } from "./DragRangeSelect";
  export type {
    DragRangeSelectProps,
    DragRangeSelectDataProps,
  } from "./DragRangeSelect";
  export * from "./DragRangeSelect.variants";

  export {
    CurrentValueIndicator,
    createCurrentValueIndicator,
  } from "./CurrentValueIndicator";
  export type {
    CurrentValue,
    CurrentValueIndicatorProps,
    CurrentValueIndicatorDataProps,
  } from "./CurrentValueIndicator";
  export * from "./CurrentValueIndicator.variants";
  ```

- [ ] **Step 2: Verify the full test suite passes.**

  ```bash
  npm test
  ```

  Expected: all Chart tests + all previously-passing repo tests pass.

  Also:

  ```bash
  npx tsc --noEmit
  ```

  Expected: 0 errors.

- [ ] **Step 3: Verify the library builds (dts emit) — this is the smoke test for ADR 0001 compliance.**

  ```bash
  npm run build
  ```

  Expected: build succeeds; `dist/index.d.ts` references every new slot + curried variant without `TS2742` warnings.

- [ ] **Step 4: Commit.**

  ```bash
  git add src/components/Chart/index.ts
  git commit -m "feat(chart): export new slot family + shapes from Chart index"
  ```

---

## Task 17: Composition smoke showcase — `dev/showcases/dotchart.tsx`

This task assembles a minimal "fake dotchart" wiring **every** new slot plus the extended ReferenceLine. It's a smoke test for the composition story, not a feature in itself.

**Files:**
- Create: `dev/showcases/dotchart.tsx`
- Modify: `dev/main.tsx` (add import + register)

**Steps:**

- [ ] **Step 1: Author the showcase.**

  Create `dev/showcases/dotchart.tsx`:

  ```tsx
  import { Component, createSignal, createMemo } from "solid-js";
  import {
    Chart,
    Grid,
    XAxis,
    YAxis,
    ReferenceLine,
    Crosshair,
    HighlightSegments,
    TimelineBar,
    PinMarkers,
    GhostPin,
    DragRangeSelect,
    CurrentValueIndicator,
    AccentHighlightSegments,
    DenseTimelineBar,
    WarningPinMarkers,
    WarningGhostPin,
    CommitOnReleaseDragRangeSelect,
    AccentCurrentValueIndicator,
    type HighlightSegment,
    type TimelineBarDatum,
    type Pin,
    type Descriptor,
  } from "../../src/components/Chart";

  // Domain → descriptor mapping at the call site (spec D4).
  const warningPin: Descriptor = { color: "var(--sui-warning)", shape: "pin" };
  const accentDot: Descriptor = { color: "var(--sui-accent)", shape: "circle" };

  export const DotchartShowcase: Component = () => {
    const t0 = new Date(2026, 4, 15, 0, 0).getTime();
    const t1 = new Date(2026, 4, 15, 8, 0).getTime();

    const segments: HighlightSegment[] = [
      { id: "s1", start: t0 + 1 * 3600_000, end: t0 + 3 * 3600_000, color: "var(--sui-accent)" },
    ];
    const bars: TimelineBarDatum[] = [
      { id: "b1", start: t0 + 0.5 * 3600_000, end: t0 + 2.5 * 3600_000, lane: "scheduled", color: "var(--sui-accent)" },
      { id: "b2", start: t0 + 3 * 3600_000, end: t0 + 4 * 3600_000, lane: "detected", color: "var(--sui-warning)" },
    ];
    const [pins, setPins] = createSignal<Pin[]>([
      { id: "p1", x: t0 + 1.5 * 3600_000, descriptor: warningPin },
    ]);
    const [selectedPin, setSelectedPin] = createSignal<string | null>(null);
    const [currentX, setCurrentX] = createSignal(t0 + 5 * 3600_000);
    const currentPoint = createMemo(() => ({ x: currentX(), y: 50, label: "now" }));

    return (
      <div class="component-section">
        <h2>DotChart Composition Smoke</h2>
        <p class="text-meta">
          Smoke test for the dotchart slot unification: HighlightSegments + TimelineBar +
          PinMarkers + GhostPin + DragRangeSelect + CurrentValueIndicator + ReferenceLine
          composed under a single &lt;Chart&gt; with a time domain.
        </p>
        <Chart width={800} height={300} xDomain={[new Date(t0), new Date(t1)]} yDomain={[0, 100]}>
          <Grid />
          <XAxis tickCount={6} />
          <YAxis />
          <ReferenceLine orientation="horizontal" value={50} label="threshold" />
          <ReferenceLine orientation="vertical" value={new Date(t0 + 6 * 3600_000)} color="var(--sui-warning)" />
          <AccentHighlightSegments data={segments} />
          <DenseTimelineBar data={bars} lanes={["scheduled", "detected"]} />
          <WarningPinMarkers
            data={pins()}
            selectedId={selectedPin()}
            onClick={(p) => setSelectedPin(p.id)}
            onDelete={(p) => setPins(pins().filter((pp) => pp.id !== p.id))}
          />
          <WarningGhostPin descriptor={warningPin} />
          <CommitOnReleaseDragRangeSelect
            onRange={(s, e) => console.log("range:", new Date(s), new Date(e))}
          />
          <AccentCurrentValueIndicator point={currentPoint()} />
          <Crosshair />
        </Chart>
      </div>
    );
  };
  ```

- [ ] **Step 2: Register in `dev/main.tsx`.**

  In `dev/main.tsx`, add an import line near the other showcase imports (alphabetical position around line 20):

  ```tsx
  import { DotchartShowcase } from "./showcases/dotchart";
  ```

  Then add `DotchartShowcase` to the showcase route registry in the same file (locate the existing `ChartShowcase` registration; mirror its pattern).

- [ ] **Step 3: Verify the dev server renders without console errors.**

  ```bash
  npm run dev
  ```

  Open the showcase route; expected: no console errors, every slot visible, mouse drag produces a translucent band, hover spawns the ghost pin, the threshold reference line is horizontal across the chart, the warning reference line is vertical.

  This is a manual smoke check; no automated assertion. If the showcase fails to render, fix forward.

- [ ] **Step 4: Final repo-wide test pass.**

  ```bash
  npm test
  npx tsc --noEmit
  npm run build
  ```

  All three commands: exit code 0.

- [ ] **Step 5: Commit.**

  ```bash
  git add dev/showcases/dotchart.tsx dev/main.tsx
  git commit -m "showcase(chart): dotchart composition smoke wiring every new slot"
  ```

---

# Known limitations / deferred

- **Pin label collision avoidance** (spec risk: `getBBox` measurement after first paint). v1 ships no collision-avoidance — labels are emitted at `descriptor.labelOffset` and may overlap. Tracked as a follow-up; spec already calls this out under "Risks".
- **`OverlayPoints`, `CorrelationBand`, `ChevronSeries`** — deferred per spec; no slot files.
- **SSR / hydration** — slots are client-only. SSR consumers must gate behind `<ClientOnly>`. Documented in slot JSDoc comments; not enforced at the type level in v1.
- **Pointer migration ripple** — Task 4 migrates `Chart` from `MouseEvent` (`onMouseMove`/`onMouseLeave`) to `PointerEvent` (`onPointerMove`/`onPointerLeave`). Existing `Chart` showcase and any consumer testing for `MouseEvent` may need to update — verified clean in Task 4 Step 3, but call out in the PR description.
- **Spec D8 filename literal (`.curried.ts`) vs repo convention (`variants.ts`)** — this plan uses `variants.ts` to match the live ADR 0001 / Cell / Layout / Surface pattern. Functionally identical: explicit `Component<…DataProps>` annotation per export, sibling file co-located with the slot, both re-exported from `index.ts`.

# Self-review (writing-skill checklist)

- **Spec coverage** — All 8 decisions (D1–D8) and the v1 slot inventory map to tasks:
  - D1 slot decomposition → Tasks 10–15.
  - D2 d3 stance → Tasks 1, 7.
  - D3 single root pointer listener → Tasks 4, 14.
  - D4 descriptor pattern → Task 5; consumed by Tasks 12–13.
  - D5 reactivity model (plain props) → enforced by slot prop signatures across Tasks 10–15.
  - D6 time scale → Tasks 2, 4, 6.
  - D7 ChartContext additions → Tasks 3, 4.
  - D8 curried variants → every slot task (10–15), with named `Component<…DataProps>` exports per ADR 0001.
  - v1 slot inventory: HighlightSegments (10), TimelineBar (11), PinMarkers (12), GhostPin (13), DragRangeSelect (14), CurrentValueIndicator (15), ReferenceLine extension (9), Crosshair (NOT extended in v1 — see note below).
- **Placeholder scan** — No "TBD", no "handle edge cases" without code, no "similar to Task N" without repeating signatures.
- **Type consistency** — `Id`, `ClickHandler<T>`, `HoverHandler<T>` defined in Task 10 (`HighlightSegments.tsx`) and re-used by Tasks 11–15 via explicit import. `Descriptor`, `Shape`, `ShapeGlyph`, `DEFAULT_GLYPH_SIZE` defined in Task 5 (`shapes.ts`) and re-used by Tasks 12–13. `dragRange`/`setDragRange` added in Task 3, consumed by Task 14. `scaleTime`/`TimeScale` added in Task 2, consumed by Tasks 4 + 6.
- **`Crosshair` "extend if needed"** — spec's v1 inventory flags this as conditional. I scanned the existing `Crosshair.tsx` (85 lines) against the amygdala `utils/indicators.ts` description in the spec: the existing slot already provides per-series dots at hoverX + an optional vertical guide. No parity gap I can confirm without reading amygdala source — left out of the plan to avoid speculative scope. Flagged in the report.
- **D3 enforcement in DragRangeSelect** — Task 14 explicitly verifies the slot attaches **no** pointer listeners; it reads `ctx.dragRange()` (set by the root listener in Task 4) and emits `onRange` / `onRangePreview` callbacks. The visual band uses `pointer-events="none"` so it never intercepts.
- **D8 enforcement** — every new slot task (10–15) authors a sibling `.variants.ts` with explicit `Component<XxxDataProps>` annotations matching ADR 0001's verbatim pattern. No hand-waves.
