# SegmentedControl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `SegmentedControl`, a generic single-select segmented control with grouped (divider-separated) states and per-state color, plus the `OverrideToggle` curried variant for the `AUTO | (PROD | OFF)` case.

**Architecture:** Atomic (Depth 1) component in `src/components/SegmentedControl/`. Owns its CSS, imports no other components. Controlled (parent owns `value`), pure render from props, value-handler callback (`onValueChange`) like `Toggle`'s `onCheckedChange`. Single divider element rendered between options whenever the adjacent `group` keys differ. WAI-ARIA radio-group semantics with roving tabindex + arrow-key navigation. Ships a `createSegmentedControl` factory mirroring `createToggle`.

**Tech Stack:** SolidJS, TypeScript, Vitest + `@solidjs/testing-library`, plain CSS with theme variables (`--sui-accent`, `--sui-danger`, `--sui-warning`, `--sui-success`).

**Spec:** `docs/superpowers/specs/2026-06-03-segmented-control-design.md`

**Conventions to follow:**
- Run a single test file with: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
- `ColorVariant` is `"default" | "primary" | "danger" | "warning" | "success"` (`src/types.ts`). There is no `--sui-primary` theme var; `primary` maps to `--sui-accent`.
- Mirror `Toggle`'s file layout: `Component.tsx` (component + factory + types), `Component.css`, `variants.ts`, `index.ts`, `Component.test.tsx`.

---

### Task 1: Scaffold component, types, and barrel (renders one segment per option)

**Files:**
- Create: `src/components/SegmentedControl/SegmentedControl.tsx`
- Create: `src/components/SegmentedControl/SegmentedControl.css`
- Create: `src/components/SegmentedControl/index.ts`
- Test: `src/components/SegmentedControl/SegmentedControl.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/SegmentedControl/SegmentedControl.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { SegmentedControl, createSegmentedControl, OverrideToggle } from "./index";
import type { SegmentOption } from "./index";

const OPTS: SegmentOption[] = [
  { value: "auto", label: "Auto", group: "mode", color: "primary" },
  { value: "prod", label: "Prod", group: "override", color: "primary" },
  { value: "off", label: "Off", group: "override", color: "danger" },
];

describe("SegmentedControl", () => {
  it("renders one segment per option with role=radio", () => {
    const { container } = render(() => <SegmentedControl options={OPTS} value="auto" />);
    const segs = container.querySelectorAll('[role="radio"]');
    expect(segs.length).toBe(3);
    expect(container.querySelector('[role="radiogroup"]')).toBeTruthy();
  });

  it("falls back to value when label is omitted", () => {
    const { container } = render(() => (
      <SegmentedControl options={[{ value: "solo" }]} value="solo" />
    ));
    expect(container.querySelector('[role="radio"]')!.textContent).toBe("solo");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: FAIL — cannot resolve `./index` / `SegmentedControl` is not defined.

- [ ] **Step 3: Create the CSS file (structural base; expanded in Task 8)**

Create `src/components/SegmentedControl/SegmentedControl.css`:

```css
/* ============================================
   SegmentedControl Component — Structural
   ============================================ */
.sui-segmented {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--sui-border);
  border-radius: 8px;
  overflow: hidden;
}
```

- [ ] **Step 4: Create the component with minimal render**

Create `src/components/SegmentedControl/SegmentedControl.tsx`:

```tsx
// lastReviewedAt: 2026-06-03
// lastReviewedBy: adlai.arnold
// ============================================
// SegmentedControl — Atomic (Depth 1)
// Owns CSS (SegmentedControl.css), no component imports.
// Generic single-select segmented control with grouped (divider-separated)
// states, per-state color, and radio-group keyboard semantics.
// ============================================
import { Component, JSX, For, Show, splitProps, mergeProps } from "solid-js";
import type { ColorVariant } from "../../types";
import "./SegmentedControl.css";

export interface SegmentOption {
  /** Stable id emitted on selection. */
  value: string;
  /** Display content; string or JSX (icons ok). Defaults to `value`. */
  label?: string | JSX.Element;
  /** Group key — a divider renders wherever this differs from the previous option's group. */
  group?: string;
  /** Accent color when THIS segment is selected. */
  color?: ColorVariant;
  /** Disable just this segment. */
  disabled?: boolean;
}

export type SegmentedControlSize = "sm" | "md" | "lg";

export interface SegmentedControlProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Ordered list of selectable states. */
  options: SegmentOption[];
  /** Controlled, single-select value. */
  value: string;
  /** Fires with the new value, only when the selection actually changes. */
  onValueChange?: (value: string) => void;
  /** Sizing, consistent with Toggle/Button. Default "md". */
  size?: SegmentedControlSize;
  /** Fallback accent for selected segments that don't specify their own. */
  color?: ColorVariant;
  /** Disable the entire control. */
  disabled?: boolean;
}

export const SegmentedControl: Component<SegmentedControlProps> = (props) => {
  const [local, others] = splitProps(props, [
    "options",
    "value",
    "onValueChange",
    "size",
    "color",
    "disabled",
    "class",
  ]);

  const containerClasses = () => {
    const cl = ["sui-segmented"];
    cl.push(`sui-segmented--${local.size || "md"}`);
    if (local.disabled) cl.push("sui-segmented--disabled");
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  const isDisabled = (opt: SegmentOption) => Boolean(local.disabled || opt.disabled);

  const segClasses = (opt: SegmentOption) => {
    const cl = ["sui-segmented__seg"];
    const selected = opt.value === local.value;
    if (selected) cl.push("sui-segmented__seg--selected");
    const color = opt.color || local.color;
    if (selected && color && color !== "default") cl.push(`sui-segmented__seg--${color}`);
    if (isDisabled(opt)) cl.push("sui-segmented__seg--disabled");
    return cl.join(" ");
  };

  return (
    <div class={containerClasses()} role="radiogroup" {...others}>
      <For each={local.options}>
        {(opt, i) => {
          const selected = () => opt.value === local.value;
          const showDivider = () => i() > 0 && local.options[i() - 1].group !== opt.group;
          return (
            <>
              <Show when={showDivider()}>
                <span class="sui-segmented__divider" aria-hidden="true" />
              </Show>
              <button
                type="button"
                role="radio"
                aria-checked={selected() ? "true" : "false"}
                class={segClasses(opt)}
              >
                {opt.label ?? opt.value}
              </button>
            </>
          );
        }}
      </For>
    </div>
  );
};
```

- [ ] **Step 5: Create the barrel**

Create `src/components/SegmentedControl/index.ts`:

```ts
export * from "./SegmentedControl";
export * from "./variants";
```

- [ ] **Step 6: Create a temporary variants stub so the barrel resolves**

Create `src/components/SegmentedControl/variants.ts` (real content lands in Task 7):

```ts
import { createSegmentedControl } from "./SegmentedControl";

export const OverrideToggle = createSegmentedControl({
  options: [
    { value: "auto", label: "Auto", group: "mode", color: "primary" },
    { value: "prod", label: "Prod", group: "override", color: "primary" },
    { value: "off", label: "Off", group: "override", color: "danger" },
  ],
});
```

> Note: `createSegmentedControl` is referenced here but defined in Task 7. To keep Task 1 self-contained and green, add the factory now as part of Step 4's file — include this block at the end of `SegmentedControl.tsx`:

```tsx
/** Config/visual props locked at variant-definition time. */
export type SegmentedControlOverrides = Pick<SegmentedControlProps, "options" | "size" | "color">;
/** Props available to consumers of a curried variant. */
export type SegmentedControlDataProps = Omit<SegmentedControlProps, keyof SegmentedControlOverrides>;

export function createSegmentedControl(
  defaults: Partial<SegmentedControlProps>,
): Component<SegmentedControlDataProps> {
  // `options` is baked into `defaults`; the cast asserts the merged props are complete.
  return (props) => <SegmentedControl {...(mergeProps(defaults, props) as SegmentedControlProps)} />;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (2 passing).

- [ ] **Step 8: Commit**

```bash
git add src/components/SegmentedControl/
git commit -m "feat(SegmentedControl): scaffold component, types, factory, barrel"
```

---

### Task 2: Selection + change-only `onValueChange` (click)

**Files:**
- Modify: `src/components/SegmentedControl/SegmentedControl.tsx`
- Test: `src/components/SegmentedControl/SegmentedControl.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` block in `SegmentedControl.test.tsx`:

```tsx
it("marks the selected segment with aria-checked + selected class", () => {
  const { container } = render(() => <SegmentedControl options={OPTS} value="prod" />);
  const prod = container.querySelectorAll('[role="radio"]')[1];
  expect(prod.getAttribute("aria-checked")).toBe("true");
  expect(prod.classList.contains("sui-segmented__seg--selected")).toBe(true);
});

it("clicking an unselected segment fires onValueChange with its value", () => {
  const onValueChange = vi.fn();
  const { container } = render(() => (
    <SegmentedControl options={OPTS} value="auto" onValueChange={onValueChange} />
  ));
  fireEvent.click(container.querySelectorAll('[role="radio"]')[2]); // Off
  expect(onValueChange).toHaveBeenCalledTimes(1);
  expect(onValueChange).toHaveBeenCalledWith("off");
});

it("clicking the already-selected segment does not fire onValueChange", () => {
  const onValueChange = vi.fn();
  const { container } = render(() => (
    <SegmentedControl options={OPTS} value="auto" onValueChange={onValueChange} />
  ));
  fireEvent.click(container.querySelectorAll('[role="radio"]')[0]); // Auto (already selected)
  expect(onValueChange).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: the `aria-checked` test passes (already implemented), but the two click tests FAIL — no `onClick` handler wired.

- [ ] **Step 3: Add the selection handler and wire onClick**

In `SegmentedControl.tsx`, add a `select` helper just after `isDisabled`:

```tsx
  const select = (opt: SegmentOption) => {
    if (isDisabled(opt) || opt.value === local.value) return;
    local.onValueChange?.(opt.value);
  };
```

Then add `onClick` to the `<button>` element:

```tsx
              <button
                type="button"
                role="radio"
                aria-checked={selected() ? "true" : "false"}
                class={segClasses(opt)}
                onClick={() => select(opt)}
              >
                {opt.label ?? opt.value}
              </button>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (5 passing).

- [ ] **Step 5: Commit**

```bash
git add src/components/SegmentedControl/
git commit -m "feat(SegmentedControl): single-select with change-only onValueChange"
```

---

### Task 3: Group dividers

**Files:**
- Modify: `src/components/SegmentedControl/SegmentedControl.tsx` (already renders dividers — this task adds the tests that pin the behavior)
- Test: `src/components/SegmentedControl/SegmentedControl.test.tsx`

> The divider markup was written in Task 1. This task locks the behavior with tests; if they pass immediately, that is the expected outcome.

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` block:

```tsx
it("renders exactly one divider for AUTO | (PROD | OFF)", () => {
  const { container } = render(() => <SegmentedControl options={OPTS} value="auto" />);
  expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(1);
});

it("renders no divider when all options share a group", () => {
  const same: SegmentOption[] = [
    { value: "a", group: "g" },
    { value: "b", group: "g" },
  ];
  const { container } = render(() => <SegmentedControl options={same} value="a" />);
  expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(0);
});

it("renders a divider between each distinct adjacent group", () => {
  const three: SegmentOption[] = [
    { value: "a", group: "x" },
    { value: "b", group: "y" },
    { value: "c", group: "z" },
  ];
  const { container } = render(() => <SegmentedControl options={three} value="a" />);
  expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(2);
});
```

- [ ] **Step 2: Run tests to verify status**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (8 passing) — divider logic from Task 1 already satisfies these. If any fail, fix the `showDivider` predicate in `SegmentedControl.tsx` so a divider renders iff `i() > 0 && options[i()-1].group !== opt.group`.

- [ ] **Step 3: Commit**

```bash
git add src/components/SegmentedControl/
git commit -m "test(SegmentedControl): pin group-divider boundaries"
```

---

### Task 4: Per-state color + size classes

**Files:**
- Modify: `src/components/SegmentedControl/SegmentedControl.tsx` (color/size class logic already present — add tests)
- Test: `src/components/SegmentedControl/SegmentedControl.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` block:

```tsx
it("applies the per-state color class to the selected segment only", () => {
  const { container } = render(() => <SegmentedControl options={OPTS} value="off" />);
  const segs = container.querySelectorAll('[role="radio"]');
  expect(segs[2].classList.contains("sui-segmented__seg--danger")).toBe(true); // Off selected
  expect(segs[0].classList.contains("sui-segmented__seg--primary")).toBe(false); // Auto not selected
});

it("falls back to control-level color when a segment has none", () => {
  const opts: SegmentOption[] = [{ value: "a" }, { value: "b" }];
  const { container } = render(() => (
    <SegmentedControl options={opts} value="a" color="success" />
  ));
  expect(container.querySelectorAll('[role="radio"]')[0].classList.contains("sui-segmented__seg--success")).toBe(true);
});

it("applies the size modifier class to the container", () => {
  const { container } = render(() => <SegmentedControl options={OPTS} value="auto" size="lg" />);
  expect(container.querySelector(".sui-segmented--lg")).toBeTruthy();
});

it("defaults to md size", () => {
  const { container } = render(() => <SegmentedControl options={OPTS} value="auto" />);
  expect(container.querySelector(".sui-segmented--md")).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify status**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (12 passing) — the `segClasses`/`containerClasses` logic from Task 1 already covers these. If any fail, reconcile the class logic in `SegmentedControl.tsx` with the assertions above.

- [ ] **Step 3: Commit**

```bash
git add src/components/SegmentedControl/
git commit -m "test(SegmentedControl): pin per-state color + size classes"
```

---

### Task 5: Keyboard navigation + roving tabindex

**Files:**
- Modify: `src/components/SegmentedControl/SegmentedControl.tsx`
- Test: `src/components/SegmentedControl/SegmentedControl.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` block:

```tsx
it("gives the selected segment tabindex 0 and the rest -1", () => {
  const { container } = render(() => <SegmentedControl options={OPTS} value="prod" />);
  const segs = container.querySelectorAll('[role="radio"]');
  expect(segs[0].getAttribute("tabindex")).toBe("-1");
  expect(segs[1].getAttribute("tabindex")).toBe("0"); // Prod selected
  expect(segs[2].getAttribute("tabindex")).toBe("-1");
});

it("ArrowRight moves selection to the next segment", () => {
  const onValueChange = vi.fn();
  const { container } = render(() => (
    <SegmentedControl options={OPTS} value="auto" onValueChange={onValueChange} />
  ));
  fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowRight" });
  expect(onValueChange).toHaveBeenCalledWith("prod");
});

it("ArrowLeft from the first segment wraps to the last", () => {
  const onValueChange = vi.fn();
  const { container } = render(() => (
    <SegmentedControl options={OPTS} value="auto" onValueChange={onValueChange} />
  ));
  fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowLeft" });
  expect(onValueChange).toHaveBeenCalledWith("off");
});

it("Home selects the first, End selects the last", () => {
  const onValueChange = vi.fn();
  const { container } = render(() => (
    <SegmentedControl options={OPTS} value="prod" onValueChange={onValueChange} />
  ));
  const group = container.querySelector('[role="radiogroup"]')!;
  fireEvent.keyDown(group, { key: "Home" });
  expect(onValueChange).toHaveBeenLastCalledWith("auto");
  fireEvent.keyDown(group, { key: "End" });
  expect(onValueChange).toHaveBeenLastCalledWith("off");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: tabindex test FAILS (no `tabindex` attr yet) and all keyboard tests FAIL (no `onKeyDown`).

- [ ] **Step 3: Add roving tabindex to the button**

In `SegmentedControl.tsx`, add `tabindex` to the `<button>`:

```tsx
              <button
                type="button"
                role="radio"
                aria-checked={selected() ? "true" : "false"}
                tabindex={selected() ? 0 : -1}
                class={segClasses(opt)}
                onClick={() => select(opt)}
              >
```

- [ ] **Step 4: Add the keyboard handler**

In `SegmentedControl.tsx`, add these helpers after `select`:

```tsx
  const enabledValues = () => local.options.filter((o) => !isDisabled(o)).map((o) => o.value);

  const move = (dir: 1 | -1 | "home" | "end") => {
    const vals = enabledValues();
    if (vals.length === 0) return;
    let next: string;
    if (dir === "home") next = vals[0];
    else if (dir === "end") next = vals[vals.length - 1];
    else {
      const idx = vals.indexOf(local.value);
      const start = idx === -1 ? 0 : idx;
      next = vals[(start + dir + vals.length) % vals.length];
    }
    if (next !== local.value) local.onValueChange?.(next);
  };

  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (e) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        move("home");
        break;
      case "End":
        e.preventDefault();
        move("end");
        break;
    }
  };
```

Wire it on the container `<div>`:

```tsx
    <div class={containerClasses()} role="radiogroup" onKeyDown={onKeyDown} {...others}>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (16 passing).

- [ ] **Step 6: Commit**

```bash
git add src/components/SegmentedControl/
git commit -m "feat(SegmentedControl): arrow-key nav + roving tabindex"
```

---

### Task 6: Disabled (whole control + per-segment)

**Files:**
- Modify: `src/components/SegmentedControl/SegmentedControl.tsx`
- Test: `src/components/SegmentedControl/SegmentedControl.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` block:

```tsx
it("does not fire onValueChange when a disabled segment is clicked", () => {
  const onValueChange = vi.fn();
  const opts: SegmentOption[] = [
    { value: "a" },
    { value: "b", disabled: true },
  ];
  const { container } = render(() => (
    <SegmentedControl options={opts} value="a" onValueChange={onValueChange} />
  ));
  fireEvent.click(container.querySelectorAll('[role="radio"]')[1]);
  expect(onValueChange).not.toHaveBeenCalled();
});

it("keyboard nav skips disabled segments", () => {
  const onValueChange = vi.fn();
  const opts: SegmentOption[] = [
    { value: "a" },
    { value: "b", disabled: true },
    { value: "c" },
  ];
  const { container } = render(() => (
    <SegmentedControl options={opts} value="a" onValueChange={onValueChange} />
  ));
  fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowRight" });
  expect(onValueChange).toHaveBeenCalledWith("c"); // skipped "b"
});

it("a fully-disabled control ignores clicks and sets aria-disabled", () => {
  const onValueChange = vi.fn();
  const { container } = render(() => (
    <SegmentedControl options={OPTS} value="auto" disabled onValueChange={onValueChange} />
  ));
  expect(container.querySelector('[role="radiogroup"]')!.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(container.querySelectorAll('[role="radio"]')[1]);
  expect(onValueChange).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify status**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: the click-disabled and keyboard-skip tests PASS (the `isDisabled` guard in `select` + `enabledValues` filter already handle these). The `aria-disabled` test FAILS — the attribute is not set yet.

- [ ] **Step 3: Set aria-disabled on the group and disable the buttons**

In `SegmentedControl.tsx`, update the container to expose `aria-disabled`:

```tsx
    <div
      class={containerClasses()}
      role="radiogroup"
      aria-disabled={local.disabled ? "true" : undefined}
      onKeyDown={onKeyDown}
      {...others}
    >
```

And on the `<button>`, reflect disabled state to the DOM (prevents focus/native activation):

```tsx
              <button
                type="button"
                role="radio"
                aria-checked={selected() ? "true" : "false"}
                aria-disabled={isDisabled(opt) ? "true" : undefined}
                disabled={isDisabled(opt)}
                tabindex={selected() ? 0 : -1}
                class={segClasses(opt)}
                onClick={() => select(opt)}
              >
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (19 passing).

- [ ] **Step 5: Commit**

```bash
git add src/components/SegmentedControl/
git commit -m "feat(SegmentedControl): disabled control + per-segment disabling"
```

---

### Task 7: Finalize the `OverrideToggle` variant

**Files:**
- Modify: `src/components/SegmentedControl/variants.ts`
- Test: `src/components/SegmentedControl/SegmentedControl.test.tsx`

> The variant file was stubbed in Task 1. This task adds its tests and a clarifying header comment. If the tests pass against the existing stub, that is the expected outcome.

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` block:

```tsx
it("OverrideToggle renders Auto / Prod / Off with one divider", () => {
  const { container } = render(() => <OverrideToggle value="auto" />);
  const segs = container.querySelectorAll('[role="radio"]');
  expect([...segs].map((s) => s.textContent)).toEqual(["Auto", "Prod", "Off"]);
  expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(1);
});

it("OverrideToggle forwards value + onValueChange", () => {
  const onValueChange = vi.fn();
  const { container } = render(() => (
    <OverrideToggle value="auto" onValueChange={onValueChange} />
  ));
  fireEvent.click(container.querySelectorAll('[role="radio"]')[2]); // Off
  expect(onValueChange).toHaveBeenCalledWith("off");
});

it("OverrideToggle colors Off as danger when selected", () => {
  const { container } = render(() => <OverrideToggle value="off" />);
  const segs = container.querySelectorAll('[role="radio"]');
  expect(segs[2].classList.contains("sui-segmented__seg--danger")).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify status**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (22 passing) against the Task 1 stub.

- [ ] **Step 3: Add a header comment to the variant file**

Replace `src/components/SegmentedControl/variants.ts` with:

```ts
import { createSegmentedControl } from "./SegmentedControl";

// AUTO | (PROD | OFF) override control. `Auto` sits in its own group; `Prod`
// and `Off` form the override group, separated from Auto by a divider. `Off`
// is coloured danger (red) when selected.
export const OverrideToggle = createSegmentedControl({
  options: [
    { value: "auto", label: "Auto", group: "mode", color: "primary" },
    { value: "prod", label: "Prod", group: "override", color: "primary" },
    { value: "off", label: "Off", group: "override", color: "danger" },
  ],
});
```

- [ ] **Step 4: Run tests to verify they still pass**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (22 passing).

- [ ] **Step 5: Commit**

```bash
git add src/components/SegmentedControl/
git commit -m "feat(SegmentedControl): document OverrideToggle variant"
```

---

### Task 8: Full CSS styling

**Files:**
- Modify: `src/components/SegmentedControl/SegmentedControl.css`

> CSS is visual and not asserted by unit tests beyond class names. Replace the structural stub with the complete stylesheet, then verify the full suite still passes.

- [ ] **Step 1: Replace the CSS file with the complete stylesheet**

Overwrite `src/components/SegmentedControl/SegmentedControl.css`:

```css
/* ============================================
   SegmentedControl Component
   ============================================ */
.sui-segmented {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--sui-border);
  border-radius: 8px;
  overflow: hidden;
  user-select: none;
  background: var(--sui-surface, transparent);
}

.sui-segmented__seg {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--sui-text-muted);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sui-segmented__seg:not(:first-child) {
  border-left: 1px solid var(--sui-border);
}

.sui-segmented__seg:hover:not(.sui-segmented__seg--disabled):not(.sui-segmented__seg--selected) {
  color: var(--sui-text);
  background: rgba(var(--sui-accent-rgb), 0.06);
}

.sui-segmented__seg:focus-visible {
  outline: 2px solid var(--sui-accent);
  outline-offset: -2px;
}

/* Selected — default accent */
.sui-segmented__seg--selected {
  background: var(--sui-accent);
  color: var(--sui-bg-deep, #001018);
}

/* Selected — color modifiers (primary maps to accent) */
.sui-segmented__seg--selected.sui-segmented__seg--primary {
  background: var(--sui-accent);
  color: var(--sui-bg-deep, #001018);
}
.sui-segmented__seg--selected.sui-segmented__seg--danger {
  background: var(--sui-danger);
  color: #fff;
}
.sui-segmented__seg--selected.sui-segmented__seg--warning {
  background: var(--sui-warning);
  color: var(--sui-bg-deep, #001018);
}
.sui-segmented__seg--selected.sui-segmented__seg--success {
  background: var(--sui-success);
  color: var(--sui-bg-deep, #001018);
}

/* Group divider — heavier than the inter-segment border */
.sui-segmented__divider {
  width: 2px;
  align-self: stretch;
  background: var(--sui-border-strong, var(--sui-text-muted));
}
/* The divider already separates groups; drop the segment's own left border
   immediately after a divider to avoid a double line. */
.sui-segmented__divider + .sui-segmented__seg {
  border-left: none;
}

/* Sizes */
.sui-segmented--sm .sui-segmented__seg {
  padding: 5px 12px;
  font-size: 12px;
}
.sui-segmented--md .sui-segmented__seg {
  padding: 8px 16px;
  font-size: 13px;
}
.sui-segmented--lg .sui-segmented__seg {
  padding: 11px 22px;
  font-size: 15px;
}

/* Disabled */
.sui-segmented__seg--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.sui-segmented--disabled {
  opacity: 0.6;
}
.sui-segmented--disabled .sui-segmented__seg {
  cursor: not-allowed;
}
```

- [ ] **Step 2: Run the full file suite to confirm nothing broke**

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (22 passing).

- [ ] **Step 3: Commit**

```bash
git add src/components/SegmentedControl/SegmentedControl.css
git commit -m "feat(SegmentedControl): full stylesheet (sizes, colors, divider, disabled)"
```

---

### Task 9: Barrel export + dev-gallery showcase

**Files:**
- Modify: `src/index.ts`
- Create: `dev/showcases/segmented-control.tsx`
- Modify: `dev/main.tsx`

- [ ] **Step 1: Export from the package barrel**

In `src/index.ts`, add alongside the other `export * from "./components/..."` lines (e.g. just after the `Toggle` export on line ~40):

```ts
export * from "./components/SegmentedControl";
```

- [ ] **Step 2: Create the showcase**

Create `dev/showcases/segmented-control.tsx`:

```tsx
import { Component, createSignal } from "solid-js";
import { SegmentedControl, OverrideToggle } from "../../src/components/SegmentedControl";
import { Stack } from "../../src/components/Layout/Stack";

export const SegmentedControlShowcase: Component = () => {
  const [mode, setMode] = createSignal("auto");
  const [view, setView] = createSignal("day");
  const [size, setSize] = createSignal("md");

  return (
    <div class="component-section">
      <h2>SegmentedControl — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Single-select control across more than two states, with group dividers and per-state color.
      </p>

      <div class="example-group">
        <h3>OverrideToggle — <code>AUTO | (PROD | OFF)</code></h3>
        <p class="text-meta">
          Curried variant. <code>Auto</code> is its own group; <code>Prod</code>/<code>Off</code>
          form the override group. <code>Off</code> colors danger when selected.
        </p>
        <OverrideToggle value={mode()} onValueChange={setMode} />
        <div class="text-meta">State: {mode()}</div>
      </div>

      <div class="example-group">
        <h3>Ungrouped, control-level color</h3>
        <SegmentedControl
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          value={view()}
          onValueChange={setView}
          color="success"
        />
        <div class="text-meta">View: {view()}</div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <Stack gap="md">
          <SegmentedControl size="sm" options={[{ value: "a", label: "SM A" }, { value: "b", label: "SM B" }]} value={size()} onValueChange={setSize} />
          <SegmentedControl size="md" options={[{ value: "a", label: "MD A" }, { value: "b", label: "MD B" }]} value={size()} onValueChange={setSize} />
          <SegmentedControl size="lg" options={[{ value: "a", label: "LG A" }, { value: "b", label: "LG B" }]} value={size()} onValueChange={setSize} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>States</h3>
        <Stack gap="md">
          <SegmentedControl
            options={[{ value: "a", label: "Enabled" }, { value: "b", label: "Disabled seg", disabled: true }, { value: "c", label: "Other" }]}
            value="a"
            onValueChange={() => {}}
          />
          <SegmentedControl disabled options={[{ value: "a", label: "Whole" }, { value: "b", label: "Control" }, { value: "c", label: "Disabled" }]} value="a" onValueChange={() => {}} />
        </Stack>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Register the showcase in the dev gallery**

In `dev/main.tsx`, add the import alongside the other showcase imports (near the `ToggleShowcase` import on line ~40):

```tsx
import { SegmentedControlShowcase } from "./showcases/segmented-control";
```

Then add an entry to the showcase registry array (near the `toggle` entry on line ~202):

```tsx
  { id: "segmented-control", label: "SegmentedControl", component: SegmentedControlShowcase, tags: ["depth:1", "form"] },
```

- [ ] **Step 4: Verify the build/typecheck and full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run src/components/SegmentedControl/SegmentedControl.test.tsx`
Expected: PASS (22 passing).

- [ ] **Step 5: Manually verify in the dev gallery (optional but recommended)**

Run: `npm run dev` (port 6006), open the gallery, select **SegmentedControl**, and confirm: the OverrideToggle shows one divider with Off in red when selected; arrow keys move selection; the disabled segment is skipped.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts dev/showcases/segmented-control.tsx dev/main.tsx
git commit -m "feat(SegmentedControl): barrel export + dev gallery showcase"
```

---

## Done / Next

After Task 9, the component is built, tested, exported, and visible in the dev gallery. To graduate it into the published SUI catalog (formal showcase wiring, `COMPONENTS.md` entry, version bump + publish), run `/promote SegmentedControl`.

## Self-Review notes (author)

- **Spec coverage:** API (Task 1) · controlled single-select + change-only callback (Task 2) · group dividers (Tasks 1+3) · per-state + fallback color (Tasks 1+4) · sizes (Task 4) · a11y radio-group + roving tabindex + keyboard (Task 5) · disabled whole/per-segment (Task 6) · `createSegmentedControl` + `OverrideToggle` (Tasks 1+7) · CSS (Task 8) · barrel + showcase (Task 9). All spec sections mapped.
- **Type consistency:** `SegmentOption`, `SegmentedControlProps`, `SegmentedControlSize`, `createSegmentedControl`, `onValueChange`, and the `sui-segmented*` class names are used identically across all tasks.
- **Note on test counts:** running totals (2 → 5 → 8 → 12 → 16 → 19 → 22) assume tests are added cumulatively to one file.
