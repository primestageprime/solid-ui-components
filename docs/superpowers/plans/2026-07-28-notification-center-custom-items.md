# NotificationCenter Custom Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a consumer define their own notification items — arbitrary body content and any number of actions each — plus six prefab action builders, without the panel losing the visual parallelism that makes it read as an inbox.

**Architecture:** `NotificationItem` gains `actions: NotificationAction[]` (each action carrying its own `onClick`/`href`/`tone`/`icon`) and `body?: () => JSX.Element`, a thunk rendered between the title row and the action row. SUI keeps rendering the unread gutter, tone well, title row, and action row on every row. The 376-line component splits into `types.ts` / `actions.ts` / `NotificationRow.tsx` / `NotificationCenter.tsx`. `Button` gains a `danger` tone, and the tone matrix is made to actually reach text buttons.

**Tech Stack:** SolidJS, TypeScript, Vitest + `@solidjs/testing-library`, Biome, BEM CSS with `--sui-*` tokens.

**Spec:** `docs/superpowers/specs/2026-07-28-notification-center-custom-items-design.md`

## Global Constraints

- **Ships additively.** No consumer change required. `NotificationItem.action` is deprecated, never removed. The release is `feat:`, not `feat!:`.
- **Layout Purity.** All arrangement composes `Layout` variants. No hand-rolled flex/grid/gap. A missing geometry means adding a named variant to `Layout/variants.ts`, never an inline style.
- **Depth-3 CSS carve-out.** `NotificationCenter.css` may only hold overlay chrome and intrinsic row decoration. Action-button colour belongs to the `Button` atomic and `_baseline.css` — never to `NotificationCenter.css`.
- **500-line module limit.** No file in this change exceeds it.
- **Test commands.** `npm test` (vitest run), `npm run check` (biome lint src && tsc --noEmit). Both must pass before every commit.
- **Icon names must exist in `IconName`.** The set used here: `close`, `check`, `trash`, `info`, `clock`, `warning`, `spinner`, `bell`.
- **Comment style.** Files carry a header block explaining the component's role and any carve-out it takes. Non-obvious decisions get a comment saying *why*, matching the density of the surrounding code.

---

### Task 1: `Button` gains a `danger` tone, and the tone matrix reaches text buttons

**Files:**
- Modify: `src/components/Button/Button.tsx:34`
- Modify: `src/components/Button/Button.css:36-53`
- Modify: `src/themes/_baseline.css:372-385`
- Test: `src/components/Button/Button.test.tsx`

**Interfaces:**
- Consumes: nothing (foundational).
- Produces: `ButtonProps["tone"]` widened to `"accent" | "outline" | "muted" | "danger"`. Task 3 renders `<TextButton tone={...}>` with all four.

**Why the `_baseline.css` half is required:** `_baseline.css` is not bundled — `themes/loader.ts:21` injects it into `<head>` at runtime, so it lands *after* the bundled component CSS. `.sui-btn--text` and `.sui-btn--tone-muted` are both `(0,1,0)` selectors, so baseline wins on source order and the tone matrix is currently dead on text buttons. Without this half, `dismissAction` and `markReadAction` (`tone: "muted"`) would render accent.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/Button/Button.test.tsx`:

```tsx
describe("Button tone matrix", () => {
  it("emits a tone class for every tone in the matrix", () => {
    const { container } = render(() => (
      <>
        <Button tone="accent">a</Button>
        <Button tone="outline">o</Button>
        <Button tone="muted">m</Button>
        <Button tone="danger">d</Button>
      </>
    ));
    expect(container.querySelector(".sui-btn--tone-accent")).toBeTruthy();
    expect(container.querySelector(".sui-btn--tone-outline")).toBeTruthy();
    expect(container.querySelector(".sui-btn--tone-muted")).toBeTruthy();
    expect(container.querySelector(".sui-btn--tone-danger")).toBeTruthy();
  });

  it("keeps the tone class alongside a curried variant's own class", () => {
    // TextButton bakes variant="text"; tone must survive as a runtime data
    // prop so an inline action can pick its colour per instance.
    const { container } = render(() => (
      <TextButton tone="danger">Delete</TextButton>
    ));
    const btn = container.querySelector("button");
    expect(btn?.classList.contains("sui-btn--text")).toBe(true);
    expect(btn?.classList.contains("sui-btn--tone-danger")).toBe(true);
  });
});
```

Add `TextButton` to the file's imports if it is not already imported (`import { TextButton } from "./variants";`).

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run src/components/Button/Button.test.tsx`
Expected: FAIL — TypeScript rejects `tone="danger"` (not assignable to `"accent" | "outline" | "muted"`), and `.sui-btn--tone-danger` is not found.

- [ ] **Step 3: Widen the tone union**

In `src/components/Button/Button.tsx`, replace line 34:

```ts
  tone?: "accent" | "outline" | "muted" | "danger";
```

- [ ] **Step 4: Add the filled danger peer to the tone matrix**

In `src/components/Button/Button.css`, after the `.sui-btn--tone-muted` rule (line 49-53), add:

```css
/* Filled danger — the destructive peer of --tone-accent. Kept in the matrix so
   `tone="danger"` is not dead on non-text variants; text buttons get their
   colour from the baseline override instead (see themes/_baseline.css). */
.sui-btn--tone-danger {
  border: 1px solid var(--sui-danger);
  background: var(--sui-danger);
  color: var(--sui-bg-deep, #001018);
  font-weight: 500;
}
```

- [ ] **Step 5: Make tone reach text buttons**

In `src/themes/_baseline.css`, immediately after the `.sui-btn--text:hover:not(:disabled)` rule (ends line 385), add:

```css
/* Tone under the text variant. The tone matrix in Button.css sits at equal
   specificity (0,1,0) to `.sui-btn--text` and loses on source order — this
   file is injected into <head> at runtime by themes/loader.ts, after the
   bundled component CSS. A (0,2,0) selector here is the same specificity lift
   `.sui-btn.sui-btn--pill` takes in Button.css, and for the same reason.
   Without this, an inline muted or danger action renders accent. */
.sui-btn--text.sui-btn--tone-muted {
  color: var(--sui-text-muted);
}
.sui-btn--text.sui-btn--tone-danger {
  color: var(--sui-danger);
}
.sui-btn--text.sui-btn--tone-muted:hover:not(:disabled) {
  color: var(--sui-text);
}
.sui-btn--text.sui-btn--tone-danger:hover:not(:disabled) {
  color: var(--sui-danger);
}
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `npx vitest run src/components/Button/Button.test.tsx` → PASS
Run: `npm run check` → clean

- [ ] **Step 7: Commit**

```bash
git add src/components/Button/Button.tsx src/components/Button/Button.css \
        src/themes/_baseline.css src/components/Button/Button.test.tsx
git commit -m "feat(button): add a danger tone and make the tone matrix reach text buttons

The tone matrix lived only in Button.css, at equal specificity to
.sui-btn--text in _baseline.css — which the loader injects into <head> at
runtime, so it won on source order. tone=\"muted\" on a TextButton silently
rendered accent. Lifts the text-variant tone rules to (0,2,0) in the
baseline, the same trick .sui-btn.sui-btn--pill already uses."
```

---

### Task 2: Split the module — `types.ts` + `NotificationRow.tsx`

Pure refactor. Zero behavior change; the existing 304-line test suite is the gate.

**Files:**
- Create: `src/components/NotificationCenter/types.ts`
- Create: `src/components/NotificationCenter/NotificationRow.tsx`
- Modify: `src/components/NotificationCenter/NotificationCenter.tsx`
- Modify: `src/components/NotificationCenter/index.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `types.ts` exporting `NotificationTone`, `NotificationActionTone`, `NotificationAction`, `NotificationItem`, `NotificationCenterProps`. `NotificationRow.tsx` exporting `NotificationRow: Component<NotificationRowProps>` and `NotificationRowProps`. Tasks 3-5 modify `NotificationRow.tsx`.

- [ ] **Step 1: Run the existing suite to establish the green baseline**

Run: `npx vitest run src/components/NotificationCenter`
Expected: PASS. Record the test count — it must be identical at the end of this task.

- [ ] **Step 2: Create `types.ts`**

```tsx
// ============================================
// NotificationCenter — types (Depth 3 support)
// The public data contract, extracted so the component, the row, and the
// prefab action builders share one definition without a cycle.
// ============================================
import type { JSX } from "solid-js";
import type { IconName } from "../Icon/Icon";

export type NotificationTone = "info" | "task" | "warning";

/** Colour of an inline action control. Maps onto Button's tone matrix. */
export type NotificationActionTone = "accent" | "muted" | "danger";

export interface NotificationAction {
  label: string;
  /** Fires on activation. An action with NEITHER `onClick` nor `href` falls
   *  back to the component-level `onAction(item)` — that is the deprecated
   *  singular `action` shape, kept working. */
  onClick?: () => void;
  /** Renders the action as a `Link` (with the → suffix) rather than a button. */
  href?: string;
  /** Default `"accent"`. */
  tone?: NotificationActionTone;
  icon?: IconName;
  disabled?: boolean;
  /** Close the panel after firing. Default: navigating actions close, and so
   *  do handler-less ones (deprecated-shape parity). See `closesPanel`. */
  dismissPanel?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  /** Arbitrary body content, rendered between the title row and the action
   *  row. A THUNK, not a JSX.Element: feeds are routinely built as
   *  module-scope arrays, and eagerly-constructed JSX there escapes the
   *  reactive root — anything reactive inside it would warn and not track.
   *  The thunk defers construction into the row's render. */
  body?: () => JSX.Element;
  /** Any number of actions, rendered in order in a wrapping row. */
  actions?: NotificationAction[];
  /** @deprecated Use `actions`. Folded in as a single-element list. */
  action?: NotificationAction;
  transient?: boolean;
  tone?: NotificationTone;
  /** Pre-formatted relative time ("2m", "1d"). SUI ships no date formatter —
   *  the consumer owns humanization and its locale. */
  when?: string;
  /** Already seen. Read items lose the unread dot and leave the badge count. */
  read?: boolean;
}

export interface NotificationCenterProps {
  items: NotificationItem[];
  badgeCount?: number;
  busy?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Row-level activation: fires when the row body is clicked (which also
   *  MAKES the row clickable — omit it and the row is inert), and as the
   *  fallback for an action that carries no `onClick` of its own. */
  onAction?: (item: NotificationItem) => void;
  emptyLabel?: string;
  label?: string;
  badgeTone?: "accent" | "neutral" | "danger";
  /** Supplying this renders the pinned footer action; omit it and the footer
   *  (and its divider) never mount — the panel has no dead affordance. */
  onMarkAllRead?: () => void;
  markAllReadLabel?: string;
}
```

- [ ] **Step 3: Create `NotificationRow.tsx` by moving the existing row JSX verbatim**

Move the `TONE_ICON` map, `rowClass`, and the entire `<TopClusterRow>…</TopClusterRow>` body out of `NotificationCenter.tsx` unchanged. Only the activation plumbing becomes props.

```tsx
// ============================================
// NotificationRow — Depth 3 support (internal)
// One inbox row: unread gutter · tone well · text column. Unboxed at rest,
// washed on hover — the leading well is what keeps it reading as a unit.
// Owns no CSS; the row's intrinsic decoration lives in NotificationCenter.css
// alongside the overlay chrome it belongs to.
//
// Exported from the module for direct testing, NOT from the package barrel —
// the public surface stays `NotificationCenter` plus its types and builders.
// ============================================
import { type Component, Index, Show } from "solid-js";
import { Icon, type IconName } from "../Icon/Icon";
import {
  ClusterRow,
  GrowTightStack,
  SpreadRow,
  TopClusterRow,
} from "../Layout/variants";
import { TextTitle, TextSublabel } from "../Text/variants";
import { TextButton } from "../Button/variants";
import { Link } from "../Navigation/Link";
import type { NotificationAction, NotificationItem, NotificationTone } from "./types";

// Tone → glyph. `task` reads as pending work, so it borrows the clock rather
// than a status glyph; an item with no tone is plain information.
const TONE_ICON: Record<NotificationTone, IconName> = {
  info: "info",
  task: "clock",
  warning: "warning",
};

export interface NotificationRowProps {
  item: NotificationItem;
  /** Fires one action. The parent owns the panel-close decision. */
  onActivateAction: (
    item: NotificationItem,
    action: NotificationAction,
    e?: MouseEvent,
  ) => void;
}

const rowClass = (item: NotificationItem) =>
  [
    "sui-notification-center__row",
    `sui-notification-center__row--${item.tone ?? "info"}`,
  ].join(" ");

export const NotificationRow: Component<NotificationRowProps> = (props) => {
  const item = () => props.item;

  return (
    <TopClusterRow class={rowClass(item())}>
      <span
        class={
          item().read || item().transient
            ? "sui-notification-center__unread"
            : "sui-notification-center__unread sui-notification-center__unread--on"
        }
        aria-hidden="true"
      />
      <span class="sui-notification-center__well">
        <Icon
          name={
            item().transient ? "spinner" : TONE_ICON[item().tone ?? "info"]
          }
          size="sm"
          aria-hidden="true"
        />
      </span>
      <GrowTightStack>
        <SpreadRow>
          <TextTitle>{item().title}</TextTitle>
          <Show when={item().when}>
            <TextSublabel class="sui-notification-center__when">
              {item().when}
            </TextSublabel>
          </Show>
        </SpreadRow>
        <Show when={item().detail}>
          <TextSublabel>{item().detail}</TextSublabel>
        </Show>
        <Show when={item().action && !item().transient}>
          {(() => {
            const it = item();
            const a = it.action as NotificationAction;
            return (
              // Left-packed row so the CTA sizes to its content and starts at
              // the text column's edge. Both branches are inline-flex and would
              // otherwise stretch as column children and centre their labels.
              <ClusterRow>
                <Show
                  when={a.href}
                  fallback={
                    <TextButton
                      tone="accent"
                      onClick={() => props.onActivateAction(it, a)}
                    >
                      {`${a.label} →`}
                    </TextButton>
                  }
                >
                  {/* `Link`, not `NavLink`: NavLink is a nav-RAIL item and
                      bakes padding-left:16px. Link is the unpadded accent
                      anchor — the right atom for an inline CTA. */}
                  <Link
                    href={a.href}
                    onClick={(e) => props.onActivateAction(it, a, e)}
                  >
                    {`${a.label} →`}
                  </Link>
                </Show>
              </ClusterRow>
            );
          })()}
        </Show>
      </GrowTightStack>
    </TopClusterRow>
  );
};
```

- [ ] **Step 4: Rewrite `NotificationCenter.tsx` to consume both**

Delete the moved code. Replace the type block with `import type { … } from "./types";` and re-export for compatibility (`export type { NotificationAction, NotificationCenterProps, NotificationItem, NotificationTone } from "./types";`). Replace the `<Index>` body with:

```tsx
<Index each={props.items}>
  {(item) => (
    <NotificationRow item={item()} onActivateAction={activate} />
  )}
</Index>
```

Change `activate` to accept the action argument it now receives, keeping today's behavior exactly:

```tsx
const activate = (
  item: NotificationItem,
  _action: NotificationAction,
  e?: MouseEvent,
) => {
  // Preserve new-tab gestures on anchors; SPA-navigate on plain left click.
  if (
    e &&
    (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
  )
    return;
  e?.preventDefault();
  props.onAction?.(item);
  requestOpen(false);
};
```

Remove the now-unused `TONE_ICON`, `rowClass`, and the `ClusterRow`/`GrowTightStack`/`TopClusterRow`/`TextSublabel`/`Link`/`Icon`-for-tone imports; keep `Icon` (the bell still uses it).

- [ ] **Step 5: Update `index.ts`**

```ts
export { NotificationCenter } from "./NotificationCenter";
export { NotificationRow } from "./NotificationRow";
export type { NotificationRowProps } from "./NotificationRow";
export type {
  NotificationCenterProps,
  NotificationItem,
  NotificationAction,
  NotificationActionTone,
  NotificationTone,
} from "./types";
```

- [ ] **Step 6: Verify the refactor changed nothing**

Run: `npx vitest run src/components/NotificationCenter`
Expected: PASS with the **same test count** as Step 1. Any failure means the move was not verbatim.
Run: `npm run check` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/NotificationCenter/
git commit -m "refactor(notification-center): split types and the row into their own modules

Pure move ahead of the actions/body work — the component was 376 lines and
the additions would push it past the 500-line limit. No behavior change; the
existing suite is the gate."
```

---

### Task 3: `actions` array, activation semantics, and the wrapping action row

**Files:**
- Create: `src/components/NotificationCenter/actions.ts`
- Modify: `src/components/NotificationCenter/NotificationRow.tsx`
- Modify: `src/components/NotificationCenter/NotificationCenter.tsx`
- Modify: `src/components/NotificationCenter/NotificationCenter.css`
- Test: `src/components/NotificationCenter/NotificationRow.test.tsx` (create)

**Interfaces:**
- Consumes: `tone="danger"` from Task 1; `types.ts` and `NotificationRow` from Task 2.
- Produces: `resolveActions(item): NotificationAction[]` and `closesPanel(action): boolean` from `actions.ts`. Task 6 adds the six builders to the same file.

- [ ] **Step 1: Write the failing tests**

Create `src/components/NotificationCenter/NotificationRow.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen } from "@solidjs/testing-library";
import { NotificationCenter } from "./index";
import { resolveActions, closesPanel } from "./actions";
import type { NotificationItem } from "./types";

afterEach(cleanup);

const item = (over: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "n1",
  title: "Build finished",
  ...over,
});
const buttons = () =>
  Array.from(document.body.querySelectorAll("button.sui-btn"));
const anchors = () => Array.from(document.body.querySelectorAll("a.link"));

describe("action resolution", () => {
  it("prefers `actions` over the deprecated singular `action`", () => {
    const legacy = { label: "Legacy" };
    const a = { label: "A", onClick: () => {} };
    expect(resolveActions(item({ action: legacy }))).toEqual([legacy]);
    expect(resolveActions(item({ actions: [a], action: legacy }))).toEqual([a]);
    expect(resolveActions(item())).toEqual([]);
  });
});

describe("panel-close resolution", () => {
  it("navigating actions close; handler-bearing in-place actions do not", () => {
    expect(closesPanel({ label: "V", href: "/x" })).toBe(true);
    expect(closesPanel({ label: "D", onClick: () => {} })).toBe(false);
  });
  it("a handler-less, href-less action closes — deprecated-shape parity", () => {
    expect(closesPanel({ label: "Legacy" })).toBe(true);
  });
  it("an explicit dismissPanel wins in both directions", () => {
    expect(closesPanel({ label: "V", href: "/x", dismissPanel: false })).toBe(false);
    expect(closesPanel({ label: "D", onClick: () => {}, dismissPanel: true })).toBe(true);
  });
});

describe("action rendering", () => {
  it("renders one control per action, in order", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            actions: [
              { label: "One", onClick: () => {} },
              { label: "Two", onClick: () => {} },
              { label: "Three", onClick: () => {} },
            ],
          }),
        ]}
        open
      />
    ));
    expect(buttons().map((b) => b.textContent)).toEqual(["One", "Two", "Three"]);
  });

  it("renders href actions as anchors with the → suffix, others without it", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            actions: [
              { label: "View", href: "/x" },
              { label: "Dismiss", onClick: () => {} },
            ],
          }),
        ]}
        open
      />
    ));
    expect(anchors()[0]?.textContent).toBe("View →");
    expect(buttons()[0]?.textContent).toBe("Dismiss");
  });

  it("maps each tone onto the Button tone class", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            actions: [
              { label: "A", onClick: () => {} },
              { label: "M", onClick: () => {}, tone: "muted" },
              { label: "D", onClick: () => {}, tone: "danger" },
            ],
          }),
        ]}
        open
      />
    ));
    // No explicit tone → accent, so the CTA and the anchor branch agree.
    expect(buttons()[0]?.classList.contains("sui-btn--tone-accent")).toBe(true);
    expect(buttons()[1]?.classList.contains("sui-btn--tone-muted")).toBe(true);
    expect(buttons()[2]?.classList.contains("sui-btn--tone-danger")).toBe(true);
  });

  it("renders a disabled action as a disabled button even when href is set", () => {
    const onAction = vi.fn();
    render(() => (
      <NotificationCenter
        items={[item({ actions: [{ label: "View", href: "/x", disabled: true }] })]}
        open
        onAction={onAction}
      />
    ));
    expect(anchors().length).toBe(0);
    const btn = buttons()[0] as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("renders no actions on a transient row", () => {
    render(() => (
      <NotificationCenter
        items={[item({ transient: true, actions: [{ label: "Nope", onClick: () => {} }] })]}
        open
      />
    ));
    expect(buttons().length).toBe(0);
  });
});

describe("action activation", () => {
  it("fires the action's own onClick and NOT the row-level onAction", () => {
    const onClick = vi.fn();
    const onAction = vi.fn();
    render(() => (
      <NotificationCenter
        items={[item({ actions: [{ label: "Go", onClick }] })]}
        open
        onAction={onAction}
      />
    ));
    fireEvent.click(buttons()[0]);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("falls back to onAction when the action carries no onClick", () => {
    const onAction = vi.fn();
    render(() => (
      <NotificationCenter
        items={[item({ actions: [{ label: "Legacy" }] })]}
        open
        onAction={onAction}
      />
    ));
    fireEvent.click(buttons()[0]);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("keeps the panel open after an in-place action, closes after a navigating one", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            actions: [
              { label: "Dismiss", onClick: () => {} },
              { label: "View", href: "/x" },
            ],
          }),
        ]}
      />
    ));
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(buttons()[0]);
    expect(document.body.textContent).toContain("Dismiss");
    fireEvent.click(anchors()[0]);
    expect(document.body.textContent).not.toContain("Dismiss");
  });

  it("ignores modifier-clicks on an anchor so new-tab gestures survive", () => {
    const onAction = vi.fn();
    render(() => (
      <NotificationCenter
        items={[item({ actions: [{ label: "View", href: "/x" }] })]}
        open
        onAction={onAction}
      />
    ));
    fireEvent.click(anchors()[0], { metaKey: true });
    expect(onAction).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("View");
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run src/components/NotificationCenter/NotificationRow.test.tsx`
Expected: FAIL — `./actions` does not exist.

- [ ] **Step 3: Create `actions.ts` with the two resolvers**

```ts
// ============================================
// NotificationCenter — action data (Depth 3 support)
// Resolution rules plus the prefab action builders. Pure data functions; no
// JSX, no component imports.
// ============================================
import type { NotificationAction, NotificationItem } from "./types";

/** `actions` wins; the deprecated singular `action` folds in as a one-element
 *  list so the old shape keeps working unchanged. */
export const resolveActions = (item: NotificationItem): NotificationAction[] =>
  item.actions ?? (item.action ? [item.action] : []);

/** Close the panel after this action fires. An explicit `dismissPanel` wins.
 *  Otherwise navigating actions close (you have left the panel), in-place ones
 *  do not (you are still triaging) — and handler-less ones close, because that
 *  is the deprecated `action` shape, which predates the flag and always did. */
export const closesPanel = (a: NotificationAction): boolean =>
  a.dismissPanel ?? (!!a.href || !a.onClick);
```

- [ ] **Step 4: Render the action row in `NotificationRow.tsx`**

Replace the whole `<Show when={item().action && !item().transient}>` block with:

```tsx
<Show when={!item().transient && actions().length > 0}>
  {/* Wrapping row — Toast's action-row geometry. Several actions on one
      notification wrap rather than growing an overflow menu; six actions on
      a notification is a design smell, not a case to engineer for. */}
  <WrapRow>
    <Index each={actions()}>
      {(action) => {
        const a = () => action();
        const isLink = () => !!a().href && !a().disabled;
        return (
          <Show
            when={isLink()}
            fallback={
              <TextButton
                tone={a().tone ?? "accent"}
                disabled={a().disabled}
                onClick={(e) => {
                  // Isolation barrier: an action click must not also reach
                  // the row's own activation handler.
                  e.stopPropagation();
                  props.onActivateAction(item(), a());
                }}
              >
                {a().label}
              </TextButton>
            }
          >
            {/* `Link`, not `NavLink`: NavLink is a nav-RAIL item and bakes
                padding-left:16px. Link is the unpadded accent anchor. The →
                suffix is the NAVIGATION signal, so it rides only this branch —
                on every action in a multi-action row it would read as noise. */}
            <Link
              href={a().href}
              onClick={(e) => {
                e.stopPropagation();
                props.onActivateAction(item(), a(), e);
              }}
            >
              {`${a().label} →`}
            </Link>
          </Show>
        );
      }}
    </Index>
  </WrapRow>
</Show>
```

Add near the top of the component: `const actions = () => resolveActions(item());`
Update imports: add `WrapRow` to the `Layout/variants` import, drop `ClusterRow`, add `import { resolveActions } from "./actions";`.

- [ ] **Step 5: Wire the close decision in `NotificationCenter.tsx`**

```tsx
const activate = (
  item: NotificationItem,
  action: NotificationAction,
  e?: MouseEvent,
) => {
  // Preserve new-tab gestures on anchors; SPA-navigate on plain left click.
  if (
    e &&
    (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
  )
    return;
  e?.preventDefault();
  // An action with no handler of its own is the deprecated shape — it routes
  // to the component-level callback, exactly as it always did.
  if (action.onClick) action.onClick();
  else props.onAction?.(item);
  if (closesPanel(action)) requestOpen(false);
};
```

Add `import { closesPanel } from "./actions";`.

- [ ] **Step 6: Run all NotificationCenter tests**

Run: `npx vitest run src/components/NotificationCenter` → PASS (new suite plus the untouched existing suite — the legacy `action` cases must still be green).
Run: `npm run check` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/NotificationCenter/
git commit -m "feat(notification-center): items carry any number of actions

Each action owns its handler, href, tone, icon, and disabled state. An action
with no onClick falls back to onAction(item), so the deprecated singular
\`action\` keeps working and this ships additively. Navigating actions close
the panel; in-place ones leave it open so a feed can be triaged in one pass."
```

---

### Task 4: The `body` slot

**Files:**
- Modify: `src/components/NotificationCenter/NotificationRow.tsx`
- Test: `src/components/NotificationCenter/NotificationRow.test.tsx`

**Interfaces:**
- Consumes: `NotificationItem.body?: () => JSX.Element` from Task 2's `types.ts`.
- Produces: nothing new; Task 7's showcase uses it.

- [ ] **Step 1: Write the failing tests**

Append to `NotificationRow.test.tsx`:

```tsx
describe("body slot", () => {
  it("renders arbitrary content between the detail line and the action row", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            detail: "Sector 7",
            body: () => <progress data-testid="bar" value={0.8} />,
            actions: [{ label: "View", href: "/x" }],
          }),
        ]}
        open
      />
    ));
    const row = document.body.querySelector(".sui-notification-center__row");
    const bar = document.body.querySelector("[data-testid='bar']");
    expect(bar).toBeTruthy();
    const order = Array.from(row?.querySelectorAll("*") ?? []);
    expect(order.indexOf(bar as Element)).toBeGreaterThan(
      order.indexOf(screen.getByText("Sector 7")),
    );
    expect(order.indexOf(bar as Element)).toBeLessThan(
      order.indexOf(document.body.querySelector("a.link") as Element),
    );
  });

  it("is not invoked for items that do not define it", () => {
    const body = vi.fn(() => <span>never</span>);
    render(() => (
      <NotificationCenter items={[item({ id: "a" }), item({ id: "b", body })]} open />
    ));
    expect(body).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("never");
  });

  it("tracks a signal read inside the thunk", () => {
    // This is the whole justification for a thunk over `string | JSX.Element`:
    // construction is deferred into the row's reactive scope.
    const [pct, setPct] = createSignal(10);
    render(() => (
      <NotificationCenter items={[item({ body: () => <span>{pct()}%</span> })]} open />
    ));
    expect(document.body.textContent).toContain("10%");
    setPct(90);
    expect(document.body.textContent).toContain("90%");
  });
});
```

Add `createSignal` to the solid-js imports at the top of the file.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/components/NotificationCenter/NotificationRow.test.tsx -t "body slot"`
Expected: FAIL — nothing renders the body.

- [ ] **Step 3: Render the body**

In `NotificationRow.tsx`, insert directly after the `<Show when={item().detail}>` block and before the action-row `<Show>`:

```tsx
{/* Consumer-owned region. The chrome above (gutter, well, title, timestamp)
    and below (actions) is invariant, which is what keeps a heterogeneous
    feed scanning as one inbox rather than a pile of cards. */}
<Show when={item().body}>
  {(body) => <>{body()()}</>}
</Show>
```

`body()` is the `Show` accessor narrowing to the defined thunk; the second call invokes it.

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run src/components/NotificationCenter` → PASS
Run: `npm run check` → clean

If the tracking test fails, the thunk is being invoked outside the row's reactive scope — fix the call site rather than the test. That test is the canary on the design decision.

- [ ] **Step 5: Commit**

```bash
git add src/components/NotificationCenter/
git commit -m "feat(notification-center): items can supply arbitrary body content

A \`body\` thunk renders between the title row and the action row. A thunk, not
JSX: feeds are built as module-scope arrays, where eagerly-constructed JSX
escapes the reactive root and silently stops tracking."
```

---

### Task 5: Row-body activation

**Files:**
- Modify: `src/components/NotificationCenter/NotificationRow.tsx`
- Modify: `src/components/NotificationCenter/NotificationCenter.tsx`
- Modify: `src/components/NotificationCenter/NotificationCenter.css`
- Test: `src/components/NotificationCenter/NotificationRow.test.tsx`

**Interfaces:**
- Consumes: `NotificationRowProps` from Task 2.
- Produces: `NotificationRowProps` gains `onActivateRow?: (item: NotificationItem) => void`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe("row-body activation", () => {
  const row = () =>
    document.body.querySelector(".sui-notification-center__row") as HTMLElement;

  it("is inert without onAction — no role, no tabindex", () => {
    render(() => <NotificationCenter items={[item()]} open />);
    expect(row().getAttribute("role")).toBeNull();
    expect(row().getAttribute("tabindex")).toBeNull();
  });

  it("becomes a button with onAction, and fires on click", () => {
    const onAction = vi.fn();
    render(() => <NotificationCenter items={[item()]} open onAction={onAction} />);
    expect(row().getAttribute("role")).toBe("button");
    expect(row().getAttribute("tabindex")).toBe("0");
    fireEvent.click(row());
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("fires on Enter and Space", () => {
    const onAction = vi.fn();
    render(() => <NotificationCenter items={[item()]} open onAction={onAction} />);
    fireEvent.keyDown(row(), { key: "Enter" });
    fireEvent.keyDown(row(), { key: " " });
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it("does not fire when an action inside it is clicked", () => {
    const onAction = vi.fn();
    const onClick = vi.fn();
    render(() => (
      <NotificationCenter
        items={[item({ actions: [{ label: "Go", onClick }] })]}
        open
        onAction={onAction}
      />
    ));
    fireEvent.click(document.body.querySelector("button.sui-btn") as Element);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/components/NotificationCenter/NotificationRow.test.tsx -t "row-body activation"`
Expected: FAIL — role is null when `onAction` is supplied.

- [ ] **Step 3: Wire conditional interactivity on the row**

Add `onActivateRow?: (item: NotificationItem) => void;` to `NotificationRowProps`, then on the `TopClusterRow`:

```tsx
// Conditionally interactive — role/tabIndex/onKeyDown are wired ONLY when the
// consumer supplied a row handler, so a row without one carries no misleading
// affordance. Same dual-mode pattern as FocusLabelBand and HeatStream.
<TopClusterRow
  class={rowClass(item())}
  role={props.onActivateRow ? "button" : undefined}
  tabIndex={props.onActivateRow ? 0 : undefined}
  onClick={() => props.onActivateRow?.(item())}
  onKeyDown={(e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    // Enter on a focused action button must not double-fire the row.
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    props.onActivateRow?.(item());
  }}
>
```

If Biome flags `noStaticElementInteractions`, add the same style of ignore comment the codebase already uses, e.g.:

```tsx
// biome-ignore lint/a11y/noStaticElementInteractions: dual-mode row — role/tabIndex/onKeyDown resolve to "button"-shaped values exactly when onActivateRow is supplied; a plain non-interactive row otherwise
```

- [ ] **Step 4: Pass the handler from `NotificationCenter.tsx`**

```tsx
<NotificationRow
  item={item()}
  onActivateAction={activate}
  onActivateRow={props.onAction ? activateRow : undefined}
/>
```

with:

```tsx
// Row-body activation closes the panel — the semantics `onAction` has had from
// the start (opening a notification takes you elsewhere).
const activateRow = (item: NotificationItem) => {
  props.onAction?.(item);
  requestOpen(false);
};
```

- [ ] **Step 5: Add the pointer affordance**

In `NotificationCenter.css`, after the `:hover` rule (line 102-105):

```css
/* Only an activatable row advertises itself as clickable. */
.sui-notification-center__row[role="button"] {
  cursor: pointer;
}
```

- [ ] **Step 6: Run and verify pass**

Run: `npx vitest run src/components/NotificationCenter` → PASS
Run: `npm run check` → clean

- [ ] **Step 7: Commit**

```bash
git add src/components/NotificationCenter/
git commit -m "feat(notification-center): the row body activates when onAction is supplied

Conditionally interactive, the FocusLabelBand/HeatStream pattern: role,
tabIndex, and Enter/Space are wired only when a handler exists, so a row
without one stays inert. Action controls stop propagation so they never
double-fire the row."
```

---

### Task 6: The six prefab action builders

**Files:**
- Modify: `src/components/NotificationCenter/actions.ts`
- Modify: `src/components/NotificationCenter/index.ts`
- Test: `src/components/NotificationCenter/actions.test.ts` (create)
- Test: `src/components/NotificationCenter/NotificationCenter.export.test.tsx`

**Interfaces:**
- Consumes: `NotificationAction` from `types.ts`; `closesPanel` from Task 3.
- Produces: `viewAction`, `dismissAction`, `markReadAction`, `acceptAction`, `declineAction`, `deleteAction` — all exported from the package barrel.

- [ ] **Step 1: Write the failing tests**

Create `src/components/NotificationCenter/actions.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import {
  acceptAction,
  closesPanel,
  declineAction,
  deleteAction,
  dismissAction,
  markReadAction,
  viewAction,
} from "./actions";

describe("prefab action builders", () => {
  it("viewAction navigates, is accent, and closes the panel", () => {
    const a = viewAction("/vault");
    expect(a).toMatchObject({ label: "View", href: "/vault", tone: "accent" });
    expect(closesPanel(a)).toBe(true);
  });

  it("the in-place builders carry their tone and glyph and leave the panel open", () => {
    const fn = () => {};
    const cases = [
      [dismissAction(fn), "Dismiss", "muted", "close"],
      [markReadAction(fn), "Mark read", "muted", "check"],
      [acceptAction(fn), "Accept", "accent", "check"],
      [declineAction(fn), "Decline", "danger", "close"],
      [deleteAction(fn), "Delete", "danger", "trash"],
    ] as const;
    for (const [action, label, tone, icon] of cases) {
      expect(action).toMatchObject({ label, tone, icon });
      expect(closesPanel(action)).toBe(false);
    }
  });

  it("every builder takes a label override", () => {
    expect(viewAction("/x", "Open the Vault").label).toBe("Open the Vault");
    expect(dismissAction(() => {}, "Clear").label).toBe("Clear");
    expect(markReadAction(() => {}, "Seen").label).toBe("Seen");
    expect(acceptAction(() => {}, "Approve").label).toBe("Approve");
    expect(declineAction(() => {}, "Reject").label).toBe("Reject");
    expect(deleteAction(() => {}, "Destroy").label).toBe("Destroy");
  });

  it("wires the supplied handler", () => {
    const fn = vi.fn();
    dismissAction(fn).onClick?.();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

Add to `NotificationCenter.export.test.tsx`:

```tsx
  it("exposes the prefab action builders", () => {
    expect(sui.viewAction).toBeTypeOf("function");
    expect(sui.dismissAction).toBeTypeOf("function");
    expect(sui.markReadAction).toBeTypeOf("function");
    expect(sui.acceptAction).toBeTypeOf("function");
    expect(sui.declineAction).toBeTypeOf("function");
    expect(sui.deleteAction).toBeTypeOf("function");
  });
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/components/NotificationCenter/actions.test.ts`
Expected: FAIL — the builders are not exported.

- [ ] **Step 3: Append the builders to `actions.ts`**

```ts
// ── Prefab actions ──────────────────────────────────────────────────────────
// Builders that take the handler, per the Table field-module precedent
// (`actionCol(id, run)`). None sets `dismissPanel`: the default already gives
// the right answer — `viewAction` navigates so it closes, the rest are in-place
// triage so they leave the panel open. `NotificationAction` is public, so a
// consumer needing a seventh writes an object literal.

/** Navigating CTA — renders as a Link with the → suffix and closes the panel. */
export const viewAction = (
  href: string,
  label = "View",
): NotificationAction => ({ label, href, tone: "accent" });

/** Clears the notification. The consumer owns removing it from `items`. */
export const dismissAction = (
  onClick: () => void,
  label = "Dismiss",
): NotificationAction => ({ label, onClick, tone: "muted", icon: "close" });

/** Per-item sibling of the `onMarkAllRead` footer, so the two read as a set. */
export const markReadAction = (
  onClick: () => void,
  label = "Mark read",
): NotificationAction => ({ label, onClick, tone: "muted", icon: "check" });

export const acceptAction = (
  onClick: () => void,
  label = "Accept",
): NotificationAction => ({ label, onClick, tone: "accent", icon: "check" });

export const declineAction = (
  onClick: () => void,
  label = "Decline",
): NotificationAction => ({ label, onClick, tone: "danger", icon: "close" });

/** Destroys the underlying thing — distinct from `dismissAction`, which only
 *  clears the notification. */
export const deleteAction = (
  onClick: () => void,
  label = "Delete",
): NotificationAction => ({ label, onClick, tone: "danger", icon: "trash" });
```

- [ ] **Step 4: Export from `index.ts`**

```ts
export {
  acceptAction,
  closesPanel,
  declineAction,
  deleteAction,
  dismissAction,
  markReadAction,
  resolveActions,
  viewAction,
} from "./actions";
```

- [ ] **Step 5: Run and verify pass**

Run: `npx vitest run src/components/NotificationCenter` → PASS
Run: `npm run check` → clean

- [ ] **Step 6: Commit**

```bash
git add src/components/NotificationCenter/
git commit -m "feat(notification-center): ship six prefab action builders

view / dismiss / mark read / accept / decline / delete. Builders take the
handler, per the Table field-module precedent; none sets dismissPanel because
the default already resolves correctly for each."
```

---

### Task 7: Showcase, icons in actions, and docs

**Files:**
- Modify: `src/components/NotificationCenter/NotificationRow.tsx` (action icons)
- Modify: `dev/showcases/notification-center.tsx`
- Modify: `CHANGELOG.md`
- Modify: `COMPONENTS.md:1186`
- Test: `src/components/NotificationCenter/NotificationRow.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-6.
- Produces: the shipped surface.

- [ ] **Step 1: Write the failing test for action icons**

```tsx
describe("action icons", () => {
  it("renders the action's glyph inside the control, hidden from AT", () => {
    render(() => (
      <NotificationCenter
        items={[item({ actions: [dismissAction(() => {})] })]}
        open
      />
    ));
    const btn = document.body.querySelector("button.sui-btn") as HTMLElement;
    const svg = btn.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    // The label still carries the accessible name.
    expect(btn.textContent).toContain("Dismiss");
  });
});
```

Import `dismissAction` from `./actions` at the top of the test file.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/components/NotificationCenter/NotificationRow.test.tsx -t "action icons"`
Expected: FAIL — no `svg` inside the button.

- [ ] **Step 3: Render the icon in both branches**

In `NotificationRow.tsx`, inside the `TextButton` and the `Link`, put the glyph before the label:

```tsx
<Show when={a().icon}>
  {(name) => <Icon name={name()} size="sm" aria-hidden="true" />}
</Show>
```

`Icon` is already imported for the tone well.

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run src/components/NotificationCenter` → PASS

- [ ] **Step 5: Extend the showcase**

In `dev/showcases/notification-center.tsx`, import the builders and add four sections. The existing examples stay untouched — they are the live check that the deprecated singular `action` still works.

```tsx
// Multi-action triage: dismiss and mark-read leave the panel open so a feed
// can be cleared in one pass; only the navigating action closes it.
const [triage, setTriage] = createSignal<NotificationItem[]>([
  {
    id: "vault",
    title: "The Vault has opened",
    detail: "Three months ahead of the projected date.",
    tone: "warning",
    when: "2m",
    actions: [
      viewAction("#/vault", "Open the Vault"),
      markReadAction(() => markOne("vault")),
      dismissAction(() => drop("vault")),
    ],
  },
  {
    id: "seat",
    title: "Gaal Dornick requests a seat on the Commission",
    detail: "Psychohistory clearance pending ratification.",
    tone: "task",
    when: "14m",
    actions: [
      acceptAction(() => resolveSeat("accepted")),
      declineAction(() => resolveSeat("declined")),
    ],
  },
  {
    id: "purge",
    title: "Encyclopedia draft 41 superseded",
    tone: "info",
    when: "3h",
    read: true,
    actions: [deleteAction(() => drop("purge"))],
  },
]);
```

with `drop`, `markOne`, and `resolveSeat` as small `setTriage` updaters, plus a `<span class="text-meta">` echoing the last resolution.

Add a custom-body example:

```tsx
// The body slot: SUI keeps the gutter, well, title row and action row; the
// consumer owns the middle. A thunk, so the signal read inside it tracks.
const [pct, setPct] = createSignal(42);
const deploying: NotificationItem[] = [
  {
    id: "deploy",
    title: "Deploying to the Periphery",
    tone: "task",
    when: "now",
    body: () => (
      <Row gap="sm" align="center">
        <progress value={pct()} max={100} />
        <span class="text-meta">{pct()}%</span>
      </Row>
    ),
    actions: [dismissAction(() => {})],
  },
];
```

with a button stepping `pct` so the tracking is visible live.

Document the registry recipe in prose:

```tsx
<h3>Heterogeneous feeds: the `kind` recipe</h3>
<p class="text-meta">
  SUI ships no renderer registry — it is one line on top of <code>body</code>,
  and items already need a transform at the boundary because <code>when</code>{" "}
  is a pre-formatted string. Keep your own map and attach the thunk:
</p>
<pre class="text-meta">{`const renderers = {
  build:   (d) => <ProgressBar value={d.pct} />,
  mention: (d) => <Excerpt {...d} />,
};
const items = wire.map((i) => ({
  ...i,
  when: humanize(i.ts),
  body: () => renderers[i.kind](i.data),
}));`}</pre>
```

Add `NotificationRow` and the six builders to the "Composed from" atom list.

- [ ] **Step 6: Verify the showcase renders**

Run: `npm run dev` and open `http://localhost:6006` → the NotificationCenter showcase.
Check by eye:
- the dismiss / mark-read buttons are **muted grey**, decline / delete are **red**, and the view CTA is **accent** — if all three render accent, Task 1's baseline rules did not land;
- clicking Dismiss keeps the panel open, clicking the view link closes it;
- stepping the deploy percentage updates the row live without reopening the panel.

- [ ] **Step 7: Update `CHANGELOG.md`**

Under `## [Unreleased]`, add `### Added` / `### Changed` / `### Fixed` / `### Deprecated` entries in the established prose style (a bolded lead sentence, then the why):
- **Added** — `NotificationItem.actions`, `NotificationItem.body`, the six builders, `Button` `tone="danger"`.
- **Changed** — `onAction` widens to row-body activation; the `→` suffix narrows to the `href` branch.
- **Fixed** — `Button`'s tone matrix now reaches text buttons; `tone="muted"` on a `TextButton` previously rendered accent, losing to `.sui-btn--text` on source order because the baseline is injected at runtime.
- **Deprecated** — `NotificationItem.action`, superseded by `actions`; still honoured, still closes the panel on activation.

- [ ] **Step 8: Update `COMPONENTS.md:1186`**

Amend the `NotificationCenter` bullet: the row shape now ends in a `WrapRow` action row rather than a single `ClusterRow`; add `actions`, `body`, and the builders to the exported-surface list; note that `onAction` also makes the row body activatable; note the `NotificationRow` split.

- [ ] **Step 9: Full verification and commit**

```bash
npm test && npm run check
```
Both must pass.

```bash
git add src/components/NotificationCenter/ dev/showcases/notification-center.tsx \
        CHANGELOG.md COMPONENTS.md
git commit -m "docs(notification-center): showcase multi-action rows, the body slot, and the kind recipe"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §1 chrome boundary | 4 (body sits between title row and action row) |
| §2 types | 2 |
| §3 thunk rationale | 4 (tracking test is the canary) |
| §4 no registry | 7 (documented as a showcase recipe) |
| §5 activation + non-breaking + close resolution | 3, 5 |
| §6 action row rendering, `→` narrowing | 3, 7 (icons) |
| §7 six builders | 6 |
| §8 Button danger tone + tone-reaches-text | 1 |
| §9 module split | 2 |
| §10 testing | 3, 4, 5, 6, 7 |
| §11 showcase | 7 |
| §12 release | 7 |

**Type consistency:** `NotificationAction` / `NotificationItem` / `NotificationCenterProps` are defined once in Task 2 and only imported afterwards. `resolveActions` and `closesPanel` keep their Task 3 signatures in Task 6. `onActivateAction` and `onActivateRow` are the prop names in Tasks 2, 3, and 5 alike.

**Known ordering constraint:** Task 1 must land before Task 3 — Task 3's tone test asserts `.sui-btn--tone-danger`, which does not typecheck until the union is widened.
