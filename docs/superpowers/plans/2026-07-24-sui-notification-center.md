# NotificationCenter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract thorcasting-ui's in-app notification center into SUI as a generic, router-agnostic, domain-agnostic `NotificationCenter` component (bell trigger + count badge + dropdown of notification items), built as a strict-layout-purity Depth-3 composite.

**Architecture:** `NotificationCenter` is a **Depth-3 composite that owns ZERO CSS**. It composes existing SUI primitives (`Surface`/`PopoverSurface`, `Layout` variants, `Text` variants, `Button` variants, `Icon`, `NavLink`) plus one new Badge-family primitive (`CountBadge`). The only thing it declares directly is **overlay position anchoring** (portal + `position: fixed` measured from the trigger, copied from `PopoverMenu`) — the sole carve-out the Layout-Purity rule grants overlay controls. All interaction (toggle, outside-click/Esc close, controlled + uncontrolled open, busy spinner, `aria-live`) lives in the composite's TypeScript; all visuals come from composed variants.

**Tech Stack:** SolidJS, TypeScript, vitest + `@solidjs/testing-library`, Biome, Vite. SUI package `@primestageprime/solid-ui-components`.

## Global Constraints

Every task's requirements implicitly include this section. Copied from `STYLE_GUIDE.md`, `AGENT_GUIDE.md`, `DESIGN_LANGUAGE.md`, `docs/agents/design-decision-tree.md`, and the extraction spec.

- **Layout Purity** — No component owns box-model geometry. Never `display:flex|grid`, `gap`, `justify-content`, `align-items`, `align-self`, `flex-*`, `place-*`, `row/column-gap`, or `overflow` in a component's own CSS or inline `style`. Express all arrangement by composing `Layout` variants (`Stack`/`Row`/`Box` + `TightStack`, `ClusterRow`, `SpreadRow`, `ScrollColumn`, `GrowBox`, …). Overlay controls may declare **only** `position: absolute|fixed` anchoring (+ the minimal `position: relative`/`display: inline-block` container that anchor needs).
- **Typography discipline** — All content text renders through the `Text` family (`TextValue`/`TextLabel`/`TextBody`/`TextSublabel`/`MutedBody`/`AccentBody`/…). Never raw `<span>`/`<strong>` for content text. Emphasis = variant choice, not bold.
- **Icons** — Always the `Icon` component (outline, `currentColor`). Never emoji glyphs. Missing glyph → add it to `Icon`.
- **Counts roll** — Numeric counts compose `DigitRoller` (via `CountChip`/`CountBadge`), which auto-rolls. `DigitRoller` must **survive** value changes: key its host with `<Index>` or a stable key, never `<For>` over rebuilt objects.
- **Curried variants only** — Never pass visual/override props inline at a call site. If a visual config is missing, add a curried variant to the library. Apps consume variants, never `create*` factories.
- **#2 Rule (expansion is gated)** — Ship the minimal set the real consumer needs; do NOT build a speculative size/tone matrix. Expanding variants/sizes/tokens/props requires Peter's sign-off, and **test/showcase usage does not count as demand** — only a shipped consumer. Every new variant/prop this plan adds is justified by the real thorcasting-ui consumer and must be surfaced for sign-off (Tasks 1–4 each flag theirs).
- **No `@solidjs/router`** in SUI. No dependence on any consumer CSS (no `.qbo-sync-spinner`).
- **Tokens only** — All colors via `--sui-*` custom properties. Never hardcode colors.
- **500-line limit** — Keep files under ~500 lines; split by concern.
- **Quality gate after every commit** — `npx tsc --noEmit` (zero errors), `npx vite build` (succeeds), `npx vitest run` (green), `npx biome check` clean. If any fail, fix and commit again.
- **Naming = shape, not domain** — `NotificationCenter`, `CountBadge` name shapes; the domain `Notification` type stays in the consumer.

### Deferred-by-#2-Rule (kept in the public types, not implemented as visual variants)

The extraction spec lists `badgeTone: "accent" | "neutral" | "danger"` and item `tone: "info" | "task" | "warning"`. The target consumer contract sets **neither** (`badgeCount` + `busy` only). Per the #2 Rule we ship a **single** non-danger badge treatment and a single item treatment now, but keep both props in the exported types so the consumer's `.map(...)` compiles unchanged and a later consumer can drive them without a breaking change. Branching on their values is out of scope for v1 — surface it to Peter when a consumer actually sets them.

---

## File Structure

**New files:**
- `src/components/NotificationCenter/NotificationCenter.tsx` — the Depth-3 composite (zero CSS). Owns overlay positioning + interaction; composes everything else.
- `src/components/NotificationCenter/NotificationCenter.test.tsx` — unit + interaction tests.
- `src/components/NotificationCenter/index.ts` — barrel: re-export component + types.
- `src/components/Badge/CountBadge.tsx` — count-only rolling corner pill (composes `DigitRoller`; owns `CountBadge.css` as the same Depth-2 exception `CountChip` is).
- `src/components/Badge/CountBadge.css` — the pill chrome (bg, radius, min-width, color) — tokens only.
- `src/components/Badge/CountBadge.test.tsx`.
- `dev/showcases/notification-center.tsx` — gallery showcase.

**Modified files:**
- `src/components/Icon/Icon.tsx` — add the `bell` glyph (IconName union + `ICON_PATHS` + `ICON_GROUPS`).
- `src/components/Surface/Surface.tsx` — add a `shadow?: boolean` override.
- `src/components/Surface/Surface.css` — add the `.surface--shadow` rule.
- `src/components/Surface/variants.ts` — add the `PopoverSurface` curried variant.
- `src/components/Badge/index.ts` — export `CountBadge` + `CountBadgeProps`.
- `src/styles/global.css` — add the shared `.sui-sr-only` utility.
- `src/index.ts` — add `export * from "./components/NotificationCenter";`.
- `dev/main.tsx` — import + register the showcase in `items[]`.
- `COMPONENTS.md` — add `## NotificationCenter` and `## CountBadge` entries.
- `package.json` / `CHANGELOG.md` — version bump for the release (Task 9).

**Dependency order:** Task 1 (bell icon) → Task 2 (Surface shadow + PopoverSurface) → Task 3 (CountBadge) → Task 4 (sr-only) are independent leaves that Task 5 (the composite) consumes. Task 5 → 6 (barrel/exports) → 7 (showcase) → 8 (COMPONENTS.md) → 9 (release) → 10 (consumer swap, in thorcasting-ui).

---

### Task 1: Add the `bell` glyph to Icon

**Files:**
- Modify: `src/components/Icon/Icon.tsx` (the `IconName` union ~line 44–103, `ICON_GROUPS` ~line 33, and `ICON_PATHS` record ~line 104)
- Test: `src/components/Icon/Icon.test.tsx` (create if absent; otherwise append)

**Interfaces:**
- Consumes: nothing.
- Produces: `IconName` now includes `"bell"`; `ICON_PATHS["bell"]` has `{ outline, solid }` SVG path strings on the 16×16 viewBox. Rendered via `<Icon name="bell" />` and inline via `ICON_PATHS["bell"].outline`.

**#2-Rule flag:** New icon glyph, driven by the NotificationCenter trigger for the thorcasting consumer. Adding a missing glyph to `Icon` is the sanctioned path (design-decision-tree: "add one to Icon when … ship"). Surface for sign-off.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Icon/Icon.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Icon, ICON_PATHS } from "./Icon";

describe("Icon bell glyph", () => {
  it("is registered in ICON_PATHS with outline + solid", () => {
    expect(ICON_PATHS.bell).toBeDefined();
    expect(ICON_PATHS.bell.outline).toContain("<path");
    expect(ICON_PATHS.bell.solid).toContain("<path");
  });
  it("renders a bell icon with the name as aria-label", () => {
    const { container } = render(() => <Icon name="bell" />);
    const el = container.querySelector('[role="img"]');
    expect(el?.getAttribute("aria-label")).toBe("bell");
    expect(el?.querySelector("svg")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Icon/Icon.test.tsx`
Expected: FAIL — `ICON_PATHS.bell` is undefined / `"bell"` not assignable to `IconName`.

- [ ] **Step 3: Add `bell` to the union, groups, and paths**

In `src/components/Icon/Icon.tsx`, add `"bell"` to the `ui` group array in `ICON_GROUPS`, add `| "bell"` to the `IconName` union, and add this entry to `ICON_PATHS` (16×16 viewBox, `currentColor`, outline + solid):

```ts
    bell: {
      outline: `<path d="M8 2a3 3 0 0 0-3 3c0 3.5-1.5 4.5-1.5 4.5h9S11 8.5 11 5a3 3 0 0 0-3-3Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M6.8 11.5a1.3 1.3 0 0 0 2.4 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M8 2a3 3 0 0 0-3 3c0 3.5-1.5 4.5-1.5 4.5h9S11 8.5 11 5a3 3 0 0 0-3-3Z" fill="currentColor"/>
              <path d="M6.8 11.5a1.3 1.3 0 0 0 2.4 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Icon/Icon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Quality gate + commit**

Run: `npx tsc --noEmit && npx biome check src/components/Icon`
```bash
git add src/components/Icon/Icon.tsx src/components/Icon/Icon.test.tsx
git commit -m "feat(icon): add bell glyph for NotificationCenter trigger"
```

---

### Task 2: Add `shadow` to Surface + `PopoverSurface` variant

The dropdown panel needs an elevated surface (bg-elevated + border + radius + **box-shadow** + width bounds). `Surface` supports bg/border/radius/minWidth/maxWidth but not shadow. Add a boolean `shadow` override + a `PopoverSurface` variant so the composite stays zero-CSS.

**Files:**
- Modify: `src/components/Surface/Surface.tsx` (props interface, `splitProps` list, `classes()`, `SurfaceOverrides`)
- Modify: `src/components/Surface/Surface.css` (add `.surface--shadow`)
- Modify: `src/components/Surface/variants.ts` (add `PopoverSurface`)
- Test: `src/components/Surface/Surface.test.tsx` (append; create if absent)

**Interfaces:**
- Consumes: nothing.
- Produces: `SurfaceProps.shadow?: boolean`; `.surface--shadow` CSS class; `export const PopoverSurface: Component<SurfaceDataProps>` = elevated popover panel (`padding: "sm"`, `radius: "md"`, `bg: "var(--sui-bg-elevated)"`, `borderColor: "var(--sui-border)"`, `shadow: true`, `minWidth: "280px"`, `maxWidth: "360px"`).

**#2-Rule flag:** New `shadow` override + `PopoverSurface` variant, driven by the NotificationCenter panel. Reusable by any future popover/menu surface. Surface for sign-off.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Surface/Surface.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Surface } from "./Surface";
import { PopoverSurface } from "./variants";

describe("Surface shadow", () => {
  it("adds .surface--shadow when shadow is set", () => {
    const { container } = render(() => <Surface shadow>x</Surface>);
    expect(container.firstElementChild?.classList.contains("surface--shadow")).toBe(true);
  });
  it("PopoverSurface is elevated + shadowed + width-bounded", () => {
    const { container } = render(() => <PopoverSurface>x</PopoverSurface>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains("surface--shadow")).toBe(true);
    expect(el.style.minWidth).toBe("280px");
    expect(el.style.maxWidth).toBe("360px");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Surface/Surface.test.tsx`
Expected: FAIL — `shadow` not a prop / `PopoverSurface` not exported.

- [ ] **Step 3: Implement `shadow` on Surface**

In `src/components/Surface/Surface.tsx`: add `shadow?: boolean;` to `SurfaceProps`; add `"shadow"` to the `splitProps` key list; in `classes()` add `if (local.shadow) classList.push("surface--shadow");`; add `"shadow"` to the `SurfaceOverrides` `Pick<...>` union.

In `src/components/Surface/Surface.css` append (no geometry — decoration only):

```css
.surface--shadow {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
```

In `src/components/Surface/variants.ts` add:

```ts
/** Elevated floating panel for overlay controls (popover/menu dropdowns):
 *  elevated bg, hairline border, md radius, drop shadow, 280–360px wide. */
export const PopoverSurface = createSurface({
  padding: "sm",
  radius: "md",
  bg: "var(--sui-bg-elevated)",
  borderColor: "var(--sui-border)",
  shadow: true,
  minWidth: "280px",
  maxWidth: "360px",
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Surface/Surface.test.tsx`
Expected: PASS.

- [ ] **Step 5: Quality gate + commit**

Run: `npx tsc --noEmit && npx vite build && npx biome check src/components/Surface`
```bash
git add src/components/Surface/Surface.tsx src/components/Surface/Surface.css src/components/Surface/variants.ts src/components/Surface/Surface.test.tsx
git commit -m "feat(surface): add shadow override + PopoverSurface variant"
```

---

### Task 3: Add the `CountBadge` primitive

A small count-only pill that rolls its digits (composes `DigitRoller`), for the bell-corner badge. Owns `CountBadge.css` as the same deliberate Depth-2 exception `CountChip` documents ("pill chrome is intrinsic styling no atomic variant expresses"). Single non-danger tone per the #2 Rule.

**Files:**
- Create: `src/components/Badge/CountBadge.tsx`
- Create: `src/components/Badge/CountBadge.css`
- Create: `src/components/Badge/CountBadge.test.tsx`
- Modify: `src/components/Badge/index.ts` (export)

**Interfaces:**
- Consumes: `DigitRoller` from `../DataDisplay/DigitRoller`.
- Produces:
  ```ts
  export interface CountBadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
    count: number;
  }
  export const CountBadge: Component<CountBadgeProps>;
  ```
  Renders `<span class="sui-count-badge">` containing `<DigitRoller value={String(count)} />`. The consumer (NotificationCenter) gates rendering on `count > 0` and gives the badge a **stable position/key** so the roller survives.

**#2-Rule flag:** New Badge-family primitive, driven by the NotificationCenter trigger badge. Single tone only (no accent/neutral/danger matrix). Surface for sign-off.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Badge/CountBadge.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CountBadge } from "./index";

describe("CountBadge", () => {
  it("renders the count", () => {
    const { container } = render(() => <CountBadge count={3} />);
    const root = container.querySelector(".sui-count-badge");
    expect(root).toBeTruthy();
    expect(root?.textContent).toMatch(/3/);
  });
  it("forwards extra attributes (e.g. aria-hidden)", () => {
    const { container } = render(() => <CountBadge count={1} aria-hidden="true" />);
    expect(container.querySelector(".sui-count-badge")?.getAttribute("aria-hidden")).toBe("true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Badge/CountBadge.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CountBadge**

```tsx
// src/components/Badge/CountBadge.tsx
// lastReviewedAt: 2026-07-24
// lastReviewedBy: adlai.arnold
// ============================================
// CountBadge — Composed (Depth 2)
// Composes DigitRoller so the count ROLLS on change (counts roll by default —
// Peter, 2026-07-14). Owns CountBadge.css as a deliberate Depth-2 exception:
// the corner-pill chrome is intrinsic styling no atomic variant expresses
// (same rationale as CountChip). Single non-danger tone (#2 Rule).
// A tiny pill of a numeric count, for overlaying a trigger's corner.
// NOTE: the roll requires this instance to SURVIVE count changes — the host
// must give it a stable position/key, not remount it.
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import { DigitRoller } from "../DataDisplay/DigitRoller";
import "./CountBadge.css";

export interface CountBadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  count: number;
}

export const CountBadge: Component<CountBadgeProps> = (props) => {
  const [local, others] = splitProps(props, ["count", "class"]);
  const cls = () =>
    local.class ? `sui-count-badge ${local.class}` : "sui-count-badge";
  return (
    <span class={cls()} {...others}>
      <DigitRoller value={String(local.count)} />
    </span>
  );
};
```

```css
/* src/components/Badge/CountBadge.css
 * Corner count pill. Tokens only. inline-flex here is INTRINSIC element styling
 * — a single self-contained pill centering its own digits — not child
 * arrangement (STYLE_GUIDE › "Child arrangement vs intrinsic element styling"). */
.sui-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--sui-accent);
  color: var(--sui-bg-deep);
  font-family: var(--sui-font-family);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}
```

In `src/components/Badge/index.ts` append:

```ts
// CountBadge — count-only rolling corner pill (Badge-family sibling of CountChip).
export { CountBadge } from "./CountBadge";
export type { CountBadgeProps } from "./CountBadge";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Badge/CountBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Quality gate + commit**

Run: `npx tsc --noEmit && npx biome check src/components/Badge`
```bash
git add src/components/Badge/CountBadge.tsx src/components/Badge/CountBadge.css src/components/Badge/CountBadge.test.tsx src/components/Badge/index.ts
git commit -m "feat(badge): add CountBadge rolling corner count pill"
```

---

### Task 4: Add the shared `.sui-sr-only` utility

The `aria-live` busy announcement needs a visually-hidden region. No shared utility exists. Add one global class (accessibility utility, not a variant).

**Files:**
- Modify: `src/styles/global.css`
- Test: covered indirectly by Task 5's a11y test (no standalone test — it's a CSS utility).

**Interfaces:**
- Produces: `.sui-sr-only` — off-screen but screen-reader-readable, using the standard clip technique.

- [ ] **Step 1: Add the utility**

Append to `src/styles/global.css`:

```css
/* Screen-reader-only: visually hidden, still announced by assistive tech.
 * Standard clip technique. Used for aria-live status regions. */
.sui-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 2: Verify build picks it up**

Run: `npx vite build`
Expected: succeeds; `dist/index.css` contains `.sui-sr-only`. Verify: `grep -c "sui-sr-only" dist/index.css` → `1` or more.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(styles): add sui-sr-only screen-reader utility"
```

---

### Task 5: Build the `NotificationCenter` composite

The Depth-3 composite. Owns overlay positioning + interaction (controlled/uncontrolled open, outside-click/Esc, busy announce); composes `Icon`, `CountBadge`, `PopoverSurface`, `Layout` variants, `Text` variants, `Button`/`NavLink` for actions. **Zero CSS file.**

**Files:**
- Create: `src/components/NotificationCenter/NotificationCenter.tsx`
- Test: `src/components/NotificationCenter/NotificationCenter.test.tsx`

**Interfaces:**
- Consumes: `Icon` (`../Icon/Icon`), `CountBadge` (`../Badge/CountBadge`), `PopoverSurface` (`../Surface/variants`), `TightStack`/`ClusterRow`/`ScrollColumn` (`../Layout/variants`), `TextValue`/`MutedBody`/`AccentBody` (`../Text/variants`), `TextButton` (`../Button/variants`), `NavLink` (`../Navigation/NavLink`). `Portal` from `solid-js/web`.
- Produces (exact public API — the consumer contract depends on these names/types):

```ts
export interface NotificationAction {
  label: string;   // SUI appends the "→" affordance; do not include it
  href?: string;   // present → anchor (new-tab gestures preserved); absent → button
}
export interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  action?: NotificationAction;
  transient?: boolean;  // passive status; excluded from badge count; spinner marker
  tone?: "info" | "task" | "warning";  // reserved (see Deferred-by-#2-Rule) — no v1 visual
}
export interface NotificationCenterProps {
  items: NotificationItem[];
  badgeCount?: number;      // default: items.filter(i => !i.transient).length
  busy?: boolean;           // trigger spinner + polite announce
  open?: boolean;           // controlled; omit → uncontrolled
  onOpenChange?: (open: boolean) => void;
  onAction?: (item: NotificationItem) => void;
  emptyLabel?: string;      // default "You're all caught up."
  label?: string;           // trigger aria-label; default "Notifications"
  badgeTone?: "accent" | "neutral" | "danger";  // reserved (see Deferred-by-#2-Rule)
}
export const NotificationCenter: Component<NotificationCenterProps>;
```

**Behavior (from the spec):**
- Badge count = `badgeCount ?? items.filter(i => !i.transient).length`. Rendered via `CountBadge` only when `> 0`. Non-danger tone (default).
- Trigger: `<button>` with `aria-label={label ?? "Notifications"}`, `aria-haspopup="true"`, `aria-expanded={isOpen()}`, `aria-busy={busy}`. Contains `<Icon name="bell" />`, an overlaid `<Icon name="spinner" />` when `busy`, and the corner `CountBadge`.
- Controlled/uncontrolled open: `isOpen()` reads `props.open` when defined else an internal signal. All open/close intents go through `requestOpen(next)` which calls `props.onOpenChange?.(next)` and, only in uncontrolled mode, sets the internal signal. **Never fight the consumer's `open`.**
- Panel: `Portal` → positioned `PopoverSurface` (position fixed, right-aligned, measured from trigger — copy `PopoverMenu`'s `computePosition`/reposition listeners). Internal list is a `ScrollColumn`/`TightStack`; items keyed with `<Index>` so `CountBadge`/spinner instances survive.
- Item: `TightStack` of [title row, detail, action]. Title row = `ClusterRow(spinner-when-transient, TextValue title)`. Detail = `MutedBody`. Action: `href` → `NavLink` (accent) with SPA-guard onClick; no `href` → `TextButton`. Both call `onAction(item)` then `requestOpen(false)`. Label text = `` `${action.label} →` ``. Transient items render the spinner marker and **no** action.
- Empty: `items` empty → `MutedBody` with `emptyLabel ?? "You're all caught up."`.
- Outside-click (mousedown) + Esc → `requestOpen(false)`; listeners registered on open, torn down on close/unmount (no leaks).
- Busy announce: a `<span class="sui-sr-only" aria-live="polite" aria-atomic="true">` that renders the busy/transient text when `busy` or a transient item is present.

- [ ] **Step 1: Write the failing tests (pure logic + interaction)**

```tsx
// src/components/NotificationCenter/NotificationCenter.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { NotificationCenter, type NotificationItem } from "./index";

afterEach(cleanup);

const task = (over: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "t1", title: "Set balance", action: { label: "Set balance", href: "/setup" }, ...over,
});
const syncing = (): NotificationItem => ({ id: "sync", title: "Syncing…", transient: true });

describe("NotificationCenter badge derivation", () => {
  it("counts non-transient items when badgeCount omitted", () => {
    const { getByLabelText, container } = render(() => (
      <NotificationCenter items={[task(), task({ id: "t2" }), syncing()]} />
    ));
    expect(getByLabelText("Notifications")).toBeTruthy();
    expect(container.querySelector(".sui-count-badge")?.textContent).toMatch(/2/);
  });
  it("honors an explicit badgeCount override", () => {
    const { container } = render(() => (
      <NotificationCenter items={[task()]} badgeCount={7} />
    ));
    expect(container.querySelector(".sui-count-badge")?.textContent).toMatch(/7/);
  });
  it("renders no badge when the derived count is 0", () => {
    const { container } = render(() => <NotificationCenter items={[syncing()]} />);
    expect(container.querySelector(".sui-count-badge")).toBeNull();
  });
});

describe("NotificationCenter open/close", () => {
  it("uncontrolled: toggles the panel on trigger click", () => {
    const { getByLabelText } = render(() => <NotificationCenter items={[task()]} />);
    const trigger = getByLabelText("Notifications");
    expect(document.body.textContent).not.toContain("Set balance →");
    fireEvent.click(trigger);
    expect(document.body.textContent).toContain("Set balance →");
    fireEvent.click(trigger);
    expect(document.body.textContent).not.toContain("Set balance →");
  });
  it("controlled: renders per `open` and never self-mutates; emits onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { getByLabelText } = render(() => (
      <NotificationCenter items={[task()]} open={false} onOpenChange={onOpenChange} />
    ));
    fireEvent.click(getByLabelText("Notifications"));
    // stays closed (consumer owns `open`), but intent was emitted
    expect(document.body.textContent).not.toContain("Set balance →");
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
  it("Escape requests close", () => {
    const onOpenChange = vi.fn();
    const { getByLabelText } = render(() => (
      <NotificationCenter items={[task()]} open onOpenChange={onOpenChange} />
    ));
    getByLabelText("Notifications"); // panel open via prop
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("NotificationCenter items", () => {
  it("action with href renders an anchor and fires onAction + close on plain click", () => {
    const onAction = vi.fn();
    const onOpenChange = vi.fn();
    const { getByText } = render(() => (
      <NotificationCenter items={[task()]} open onAction={onAction} onOpenChange={onOpenChange} />
    ));
    const link = getByText("Set balance →") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/setup");
    fireEvent.click(link);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it("action without href renders a button", () => {
    const { getByText } = render(() => (
      <NotificationCenter items={[task({ action: { label: "Review" } })]} open />
    ));
    expect((getByText("Review →") as HTMLElement).tagName).toBe("BUTTON");
  });
  it("transient item shows a spinner and no action", () => {
    const { container, queryByText } = render(() => (
      <NotificationCenter items={[syncing()]} open />
    ));
    expect(container.querySelector(".jtf-icon--spinning")).toBeTruthy();
    expect(queryByText(/→/)).toBeNull();
  });
  it("empty items shows the empty label", () => {
    const { getByText } = render(() => (
      <NotificationCenter items={[]} open emptyLabel="All caught up." />
    ));
    expect(getByText("All caught up.")).toBeTruthy();
  });
});

describe("NotificationCenter busy a11y", () => {
  it("marks the trigger busy and announces politely", () => {
    const { getByLabelText, container } = render(() => (
      <NotificationCenter items={[]} busy />
    ));
    expect(getByLabelText("Notifications").getAttribute("aria-busy")).toBe("true");
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(container.querySelector(".jtf-icon--spinning")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/NotificationCenter/NotificationCenter.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the composite**

```tsx
// src/components/NotificationCenter/NotificationCenter.tsx
// lastReviewedAt: 2026-07-24
// lastReviewedBy: adlai.arnold
// ============================================
// NotificationCenter — Composed (Depth 3)
// Zero CSS. Composes Icon, CountBadge, PopoverSurface, Layout/Text/Button
// variants + NavLink. Declares ONLY overlay position anchoring (Portal +
// fixed, measured from the trigger — the overlay carve-out of Layout Purity).
// Router-agnostic + domain-agnostic: consumer supplies items and navigates
// via onAction. See docs/superpowers/plans/2026-07-24-sui-notification-center.md
// ============================================
import {
  type Component,
  type JSX,
  For,
  Index,
  Show,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Icon } from "../Icon/Icon";
import { CountBadge } from "../Badge/CountBadge";
import { PopoverSurface } from "../Surface/variants";
import { TightStack, ClusterRow, ScrollColumn } from "../Layout/variants";
import { TextValue, MutedBody, AccentBody } from "../Text/variants";
import { TextButton } from "../Button/variants";
import { NavLink } from "../Navigation/NavLink";

export interface NotificationAction {
  label: string;
  href?: string;
}
export interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  action?: NotificationAction;
  transient?: boolean;
  tone?: "info" | "task" | "warning";
}
export interface NotificationCenterProps {
  items: NotificationItem[];
  badgeCount?: number;
  busy?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction?: (item: NotificationItem) => void;
  emptyLabel?: string;
  label?: string;
  badgeTone?: "accent" | "neutral" | "danger";
}

export const NotificationCenter: Component<NotificationCenterProps> = (props) => {
  const [internalOpen, setInternalOpen] = createSignal(false);
  const [pos, setPos] = createSignal<{ top: number; right: number }>();
  let containerRef: HTMLSpanElement | undefined;
  let triggerRef: HTMLButtonElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  const isControlled = () => props.open !== undefined;
  const isOpen = () => (isControlled() ? !!props.open : internalOpen());

  const badge = () =>
    props.badgeCount ?? props.items.filter((i) => !i.transient).length;
  const label = () => props.label ?? "Notifications";
  const empty = () => props.items.length === 0;
  const announce = createMemo(() => {
    const transients = props.items.filter((i) => i.transient).map((i) => i.title);
    if (transients.length) return transients.join(", ");
    return props.busy ? "Working…" : "";
  });

  const computePosition = () => {
    if (!triggerRef) return;
    const r = triggerRef.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };
  const panelStyle = (): JSX.CSSProperties => {
    const p = pos();
    return p
      ? { position: "fixed", top: `${p.top}px`, right: `${p.right}px`, "z-index": "50" }
      : { position: "fixed" };
  };

  const onDocMouseDown = (e: MouseEvent) => {
    const t = e.target as Node;
    if (!containerRef?.contains(t) && !panelRef?.contains(t)) requestOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") requestOpen(false);
  };
  const reposition = () => computePosition();
  const setupListeners = () => {
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
  };
  const teardownListeners = () => {
    document.removeEventListener("mousedown", onDocMouseDown);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("scroll", reposition, true);
    window.removeEventListener("resize", reposition);
  };
  onCleanup(teardownListeners);

  // Single choke point for every open/close intent. Emits onOpenChange always;
  // mutates internal state ONLY when uncontrolled (never fight the consumer).
  const requestOpen = (next: boolean) => {
    props.onOpenChange?.(next);
    if (!isControlled()) setInternalOpen(next);
  };

  // Keep listeners + position in sync with the resolved open state (covers
  // controlled opens the consumer drives, e.g. auto-open).
  const syncOverlay = createMemo(() => {
    if (isOpen()) {
      computePosition();
      setupListeners();
    } else {
      teardownListeners();
    }
    return isOpen();
  });

  const toggle = () => requestOpen(!isOpen());

  const activate = (item: NotificationItem, e?: MouseEvent) => {
    // Preserve new-tab gestures on anchors; SPA-navigate on plain left click.
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0))
      return;
    e?.preventDefault();
    props.onAction?.(item);
    requestOpen(false);
  };

  return (
    <span ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label()}
        aria-haspopup="true"
        aria-expanded={isOpen()}
        aria-busy={props.busy ? "true" : undefined}
        onClick={toggle}
        style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", color: "var(--sui-text-secondary)" }}
      >
        <Icon name="bell" size="md" />
        <Show when={props.busy}>
          <span style={{ position: "absolute", top: "-2px", right: "-2px" }}>
            <Icon name="spinner" size="xs" />
          </span>
        </Show>
        <Show when={badge() > 0}>
          <span style={{ position: "absolute", top: "-4px", right: "-4px" }}>
            <CountBadge count={badge()} aria-hidden="true" />
          </span>
        </Show>
      </button>

      <span class="sui-sr-only" aria-live="polite" aria-atomic="true">
        {announce()}
      </span>

      <Show when={syncOverlay()}>
        <Portal>
          <div ref={panelRef} style={panelStyle()} role="region" aria-label={label()}>
            <PopoverSurface>
              <Show
                when={!empty()}
                fallback={<MutedBody>{props.emptyLabel ?? "You're all caught up."}</MutedBody>}
              >
                <ScrollColumn>
                  <Index each={props.items}>
                    {(item) => (
                      <TightStack>
                        <ClusterRow>
                          <Show when={item().transient}>
                            <Icon name="spinner" size="sm" aria-hidden="true" />
                          </Show>
                          <TextValue>{item().title}</TextValue>
                        </ClusterRow>
                        <Show when={item().detail}>
                          <MutedBody>{item().detail}</MutedBody>
                        </Show>
                        <Show when={item().action && !item().transient}>
                          {(() => {
                            const it = item();
                            const a = it.action!;
                            return (
                              <Show
                                when={a.href}
                                fallback={
                                  <TextButton onClick={() => activate(it)}>
                                    <AccentBody>{`${a.label} →`}</AccentBody>
                                  </TextButton>
                                }
                              >
                                <NavLink
                                  color="accent"
                                  href={a.href}
                                  onClick={(e) => activate(it, e)}
                                >
                                  {`${a.label} →`}
                                </NavLink>
                              </Show>
                            );
                          })()}
                        </Show>
                      </TightStack>
                    )}
                  </Index>
                </ScrollColumn>
              </Show>
            </PopoverSurface>
          </div>
        </Portal>
      </Show>
    </span>
  );
};
```

> Implementer notes: (1) verify `TextButton`, `ScrollColumn`, `ClusterRow`, `TightStack`, `AccentBody`, `MutedBody`, `TextValue` are the exact exported names in `Text/variants.ts`, `Layout/variants.ts`, `Button/variants.ts` — substitute the nearest existing variant if a name differs, and if none fits, ADD the variant to that file (a missing variant is the finding, per Layout Purity) rather than inlining style. (2) The trigger's `background/border/color` inline style is chrome the Button variants don't express for an icon-only transparent bell; if an `IconOnlyButton`/`GhostButton` gives the same transparent look, prefer composing it and drop the inline style. (3) `ScrollColumn` provides internal overflow; if the panel needs a bounded max-height for long lists, add a `PopoverScrollColumn` variant (`ScrollColumn` + `max-height`) to `Layout/variants.ts` rather than an inline `max-height`.

- [ ] **Step 4: Add the barrel**

```ts
// src/components/NotificationCenter/index.ts
export { NotificationCenter } from "./NotificationCenter";
export type {
  NotificationCenterProps,
  NotificationItem,
  NotificationAction,
} from "./NotificationCenter";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/NotificationCenter/NotificationCenter.test.tsx`
Expected: PASS (all groups). Fix any variant-name mismatches surfaced by `tsc` first.

- [ ] **Step 6: Quality gate + commit**

Run: `npx tsc --noEmit && npx vite build && npx biome check src/components/NotificationCenter`
```bash
git add src/components/NotificationCenter/
git commit -m "feat(notification-center): add generic router-agnostic NotificationCenter"
```

---

### Task 6: Export from the package root

**Files:**
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `src/components/NotificationCenter/index.ts`, `src/components/Badge/index.ts` (already updated in Task 3).
- Produces: `NotificationCenter`, `NotificationItem`, `NotificationAction`, `CountBadge`, `CountBadgeProps` importable from `@primestageprime/solid-ui-components`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/NotificationCenter/NotificationCenter.export.test.tsx
import { describe, it, expect } from "vitest";
import * as sui from "../../index";

describe("package root exports", () => {
  it("exposes NotificationCenter and its types", () => {
    expect(sui.NotificationCenter).toBeTypeOf("function");
    expect(sui.CountBadge).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/NotificationCenter/NotificationCenter.export.test.tsx`
Expected: FAIL — `sui.NotificationCenter` is undefined.

- [ ] **Step 3: Add the export line**

In `src/index.ts`, add alongside the other `export * from "./components/..."` lines (Badge's is already there — `CountBadge` flows through it):

```ts
export * from "./components/NotificationCenter";
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/NotificationCenter/NotificationCenter.export.test.tsx`
Expected: PASS.

- [ ] **Step 5: Quality gate + commit**

Run: `npx tsc --noEmit && npx vite build`
```bash
git add src/index.ts src/components/NotificationCenter/NotificationCenter.export.test.tsx
git commit -m "feat(exports): export NotificationCenter from package root"
```

---

### Task 7: Add the dev-gallery showcase

**Files:**
- Create: `dev/showcases/notification-center.tsx`
- Modify: `dev/main.tsx` (import + `items[]` entry)

**Interfaces:**
- Consumes: `NotificationCenter` from `../../src/components/NotificationCenter` (or the root); `createSignal` for the interactive examples.
- Produces: `NotificationCenterShowcase` registered in the gallery under id `notification-center`.

- [ ] **Step 1: Write the showcase**

Follow the `dev/showcases/popover-menu.tsx` layout (a `NotificationCenterShowcase` `Component`, `<div class="component-section">` blocks with `<h2>`/`<p class="text-meta">`). Cover: (a) tasks + a transient syncing row (uncontrolled), (b) `busy` spinner, (c) empty state, (d) explicit `badgeCount`, (e) a controlled example driven by a local signal (mirrors the consumer's auto-open). Reference the composed atoms in an "Atoms/Variants" section per Showcase Conventions (`Icon` bell/spinner, `CountBadge`, `PopoverSurface`, `TightStack`/`ClusterRow`/`ScrollColumn`, `TextValue`/`MutedBody`/`AccentBody`, `TextButton`, `NavLink`).

- [ ] **Step 2: Register it in `dev/main.tsx`**

Add the import near the other showcase imports:
```ts
import { NotificationCenterShowcase } from "./showcases/notification-center";
```
Add to the `items: Item[]` array:
```ts
{
  id: "notification-center",
  label: "NotificationCenter",
  component: NotificationCenterShowcase,
  tags: ["depth:2", "feedback", "navigation"],
},
```

- [ ] **Step 3: Verify it renders**

Run: `npm run dev` (port 6006), open `#notification-center`, confirm: bell + badge, dropdown opens/closes on click + outside-click + Esc, spinner on `busy`, transient row spinner, empty state, light + dark themes both correct (toggle theme in the gallery). Stop the dev server.

- [ ] **Step 4: Quality gate + commit**

Run: `npx tsc --noEmit && npx biome check dev/showcases/notification-center.tsx dev/main.tsx`
```bash
git add dev/showcases/notification-center.tsx dev/main.tsx
git commit -m "docs(showcase): add NotificationCenter gallery showcase"
```

---

### Task 8: Document in COMPONENTS.md

**Files:**
- Modify: `COMPONENTS.md`

- [ ] **Step 1: Add the entries**

Add a `## NotificationCenter` section and a `## CountBadge` entry (or under `## Badge`) following the existing dense-bullet format (depth classification, one-line desc, `Key props:` with types/defaults, `Exported types:`, `Use for:`, theming note). For NotificationCenter, document: `items`, `badgeCount?` (default derived), `busy?`, `open?`/`onOpenChange?` (controlled + uncontrolled), `onAction?`, `emptyLabel?` (default "You're all caught up."), `label?` (default "Notifications"); note `badgeTone?`/item `tone?` are **reserved** (present in the type, no v1 visual — #2 Rule); note it's router-agnostic (consumer navigates in `onAction`) and depends on no consumer CSS. For CountBadge: `count` prop, rolls via DigitRoller, single tone.

- [ ] **Step 2: Commit**

```bash
git add COMPONENTS.md
git commit -m "docs(components): document NotificationCenter + CountBadge"
```

---

### Task 9: Release (version bump + tag)

Follow the repo's existing release convention (the `promote` skill covers this; mirror the last release commit, e.g. `chore: release 0.112.1`). NotificationCenter has no override props to curry, so it ships as-is (no `variants.ts`), like `CountChip`.

- [ ] **Step 1: Full gate**

Run: `npx tsc --noEmit && npx vite build && npx vitest run && npx biome check`
Expected: all green.

- [ ] **Step 2: Bump + changelog + tag + push**

Bump `package.json` version (minor — new component; e.g. `0.112.1` → `0.113.0`), update `CHANGELOG.md`, commit `chore: release 0.113.0`, tag, and push per the repo convention so the GitHub Packages publish fires. Confirm the tag SHA equals the release commit SHA.

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release 0.113.0"
git tag v0.113.0
git push && git push --tags
```

---

### Task 10: Consumer migration (thorcasting-ui — separate repo)

> This task runs in `~/gits/primestage/thorcasting-workspace/thorcasting-ui`, NOT in SUI. Keep the pin bump and the swap in ONE change so CI/prod never sees a half-migrated state (spec Rollout §3–4).

**Files (thorcasting-ui):**
- Modify: the SUI pin in `package.json` + lockfile (tag SHA must equal lock SHA).
- Modify: `src/components/AppTopBar.tsx` (use the SUI component via the adapter).
- Delete: `src/components/NotificationCenter.tsx`.
- Modify: `src/app.css` (drop `.qbo-sync-spinner` **only after** `grep -rn "qbo-sync-spinner" src/` shows no other consumer).

- [ ] **Step 1: Bump the pin to `v0.113.0`** and install so lock SHA matches the tag.
- [ ] **Step 2: Replace `AppTopBar`'s notification usage with the adapter** from the spec (Consumer contract §): `useNavigate`, local `open` signal, the one-shot `AUTO_OPEN_KEY` `createEffect`, the `items()` map (`{ id, title, detail, transient, tone: severity, action: cta && { label, href } }`), and `<NotificationCenter items badgeCount busy open onOpenChange onAction emptyLabel />` where `onAction` = `setOpen(false); if (item.action?.href) navigate(item.action.href)`.
- [ ] **Step 3: Delete** `src/components/NotificationCenter.tsx`.
- [ ] **Step 4: Remove `.qbo-sync-spinner`** from `src/app.css` if `grep -rn "qbo-sync-spinner" src/` is otherwise empty.
- [ ] **Step 5: Verify** the four behaviors hold: badge = task count (transient excluded); CTA navigates + closes; global "Syncing…" transient row with spinner; app-driven auto-open-once via `open`. Typecheck + run the app.
- [ ] **Step 6: Commit** the pin bump + swap + delete + css cleanup together.

---

## Self-Review

**Spec coverage** (each spec requirement → task):
- Bell trigger + badge + dropdown → Tasks 1, 3, 5. ✓
- Ordered list, no sorting in SUI (`<Index>` preserves order) → Task 5. ✓
- Open/close toggle, outside-click + Esc, controlled + uncontrolled → Task 5 (tests cover all). ✓
- Busy spinner on trigger + per-item transient spinner, independent inputs → Task 5 (`busy` + `transient`). ✓
- SUI's own spinner, not `.qbo-sync-spinner` → Task 5 uses `Icon name="spinner"`; Task 10 removes the class. ✓
- Theming via tokens, light + dark → Tasks 2/3 (tokens only) + Task 7 (verify both themes). ✓
- A11y: aria-label, aria-expanded, polite busy announce → Task 5 + Task 4 (`.sui-sr-only`). ✓
- Item type + Props (exact shapes) → Task 5 `Interfaces`. ✓
- `action.href` → anchor with new-tab gestures + onAction on plain click; no href → button → Task 5 (`activate` modifier guard; NavLink vs TextButton; tests). ✓
- After action: onAction then close → Task 5 `activate`. ✓
- Badge derivation (transient excluded) + override → Task 5 (tests). ✓
- Empty label default → Task 5. ✓
- Build on existing Popover positioning + Badge primitives → Task 5 copies PopoverMenu positioning; composes CountBadge (Badge family). ✓
- No `@solidjs/router`, no consumer CSS → Task 5 (NavLink is router-free; zero CSS). ✓
- Export types + showcase + unit coverage of pure bits → Tasks 6, 7, 5. ✓
- Non-goals (no routing/state/persistence/auto-open in SUI) → honored; auto-open stays in consumer (Task 10). ✓
- Rollout + acceptance → Tasks 9, 10. ✓

**Deviations from the spec (deliberate, flagged):**
- `badgeTone`/item `tone` kept in the exported types but not implemented as visual variants (#2 Rule — no shipped consumer sets them). Documented in Task 8. This keeps the consumer contract compiling while avoiding a speculative matrix.
- New library expansions (`bell` glyph, `Surface.shadow`+`PopoverSurface`, `CountBadge`, `.sui-sr-only`) are each flagged for Peter's sign-off per the #2 Rule, all justified by the real thorcasting consumer.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" — each code step shows real code. The one place with a judgment call (variant-name verification / trigger chrome / optional `PopoverScrollColumn`) is called out explicitly in Task 5's implementer notes with the exact rule to apply, not left vague.

**Type consistency:** `NotificationItem`/`NotificationAction`/`NotificationCenterProps` names + fields identical across Tasks 5, 6, 8, 10. `CountBadgeProps.count` consistent across Tasks 3, 5. `requestOpen`/`isOpen`/`activate` used consistently within Task 5.
