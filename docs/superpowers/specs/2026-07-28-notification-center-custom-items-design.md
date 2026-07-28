# NotificationCenter: consumer-defined items with arbitrary actions

**Date:** 2026-07-28
**Status:** Design — approved, not yet implemented
**Repo:** `solid-ui-components`
**Builds on:** `docs/superpowers/plans/2026-07-24-sui-notification-center.md`, the
0.115.0 inbox rebuild

## Goal

A consumer can describe their own notification items — arbitrary body content
and any number of actions per item — without SUI losing the visual parallelism
that makes the panel read as an inbox. SUI ships a small roster of prefab action
builders so the common cases (view, dismiss, mark read, accept/decline, delete)
are one call rather than one object literal each.

Ships **additively**. No consumer change is required; `NotificationItem.action`
is deprecated, not removed.

## Why the current shape doesn't stretch

`NotificationItem` today carries exactly one optional action, `{ label, href? }`,
and activation flows through a single component-level `onAction(item)` which
also closes the panel. Three things break under real feeds:

1. **One action is not enough.** A row that reports a failed job wants *Retry*
   and *Dismiss*. An access request wants *Accept* and *Decline*. The singular
   field cannot express either.
2. **`onAction(item)` cannot say which action fired** once there is more than
   one.
3. **Closing the panel is not universally correct.** `View log →` navigates away,
   so closing is right. `Dismiss` and `Mark read` are triage — closing forces the
   user to reopen the bell between every click.

Separately, `detail?: string` is the only body affordance. Notification feeds are
genuinely heterogeneous — a deploy row wants a progress bar, a mention wants an
excerpt, a quota warning wants a meter — and a string cannot carry any of it.

## 1. Where the invariant chrome ends

The panel only reads as an inbox while rows stay visually parallel. So the
arbitrary region is bounded: **SUI always renders the unread gutter, the tone
well, the title row (title + timestamp), and the action row.** The consumer owns
the region between the title row and the action row.

```
┌───────────────────────────────┐
│ ●  ┌─┐  Build finished     2m │  ← SUI chrome
│    │⚙│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │
│    └─┘  ┈  consumer body  ┈   │  ← arbitrary
│         ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │
│         View log →  Dismiss   │  ← SUI chrome
└───────────────────────────────┘
```

Every row therefore keeps a shared leading edge and a shared action row, however
different the middles are.

## 2. Types

```ts
export type NotificationTone = "info" | "task" | "warning";
export type NotificationActionTone = "accent" | "muted" | "danger";

export interface NotificationAction {
  label: string;
  onClick?: () => void;
  /** Renders the action as a Link (with the → suffix) rather than a button. */
  href?: string;
  /** Default "accent". */
  tone?: NotificationActionTone;
  icon?: IconName;
  disabled?: boolean;
  /** Close the panel after firing. Defaults to `!!href`. */
  dismissPanel?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  /** Arbitrary body content, rendered between the title row and the action
   *  row. A thunk, not a JSX.Element — see §3. */
  body?: () => JSX.Element;
  actions?: NotificationAction[];
  /** @deprecated Use `actions`. Folded in as a single-element list. */
  action?: NotificationAction;
  transient?: boolean;
  tone?: NotificationTone;
  when?: string;
  read?: boolean;
}
```

`props` are unchanged except that `onAction`'s meaning widens (§5). No new
top-level props are added.

`dismissPanel` defaulting to `!!href` is load-bearing: navigating leaves the
panel, in-place actions keep the user triaging. Every prefab inherits the
default rather than restating it, so the rule lives in one place.

### Deliberately excluded

- **A per-item `icon` override.** `tone` already selects the glyph. Adding a
  second, higher-precedence source for the same pixel is surface without a
  demand behind it.
- **An overflow menu on the action row.** Six actions on a notification is a
  design smell, not a case to engineer for. The action row wraps (§6).
- **A `renderers` registry keyed by a `kind` discriminant.** See §4.

## 3. Why `body` is a thunk, not `string | JSX.Element`

`Toast` takes `description?: string | JSX.Element` (`Toast.tsx:43`), and the
obvious move is to mirror it. That precedent does not transfer, for a reason
specific to how the two components are used.

Toast items are constructed inside a component, at call time, in a reactive
scope. Notification feeds are constructed as **module-scope arrays** — the
existing showcase does exactly that at `dev/showcases/notification-center.tsx:13`.
Eagerly-constructed JSX at module scope escapes the reactive root: anything
reactive inside it warns and does not track.

A `() => JSX.Element` thunk defers construction into the row's render, where it
belongs. `detail?: string` stays as-is for the plain case, which is the majority
of rows and gets the muted-sublabel treatment for free.

## 4. Why there is no renderer registry

A registry keyed by a `kind` discriminant (`STYLE_GUIDE.md:33` endorses
`Dynamic` + lookup maps) is the conventional way to render a heterogeneous feed,
and it was considered. It is not worth its surface here:

- **It is a consumer one-liner on top of the slot.**
  `items.map(i => ({ ...i, body: () => renderers[i.kind](i.data) }))`. The
  inverse is not true — a pure registry still needs a per-item override for
  one-offs, which is the slot again.
- **Its headline advantage does not apply.** The registry sells "items stay
  serializable JSON straight off the wire," but the consumer already cannot pass
  wire data through: `when` must be a pre-formatted relative string, because SUI
  deliberately ships no date formatter (`NotificationCenter.tsx:66`). There is
  already a mandatory transform at the boundary; attaching a closure inside a
  transform you are already writing is free.
- **It costs a `kind` discriminant, a `data` payload, a generic parameter, and a
  `renderers` prop** to deliver what one optional field already delivers.

The registry is documented as a consumer-side recipe in the showcase instead of
becoming API.

## 5. Activation, and why this ships non-breaking

The naive reading of "each action carries its own `onClick`" silently breaks
every existing consumer: today clicking the single action fires `onAction(item)`,
and afterwards it would fire nothing. One rule avoids that:

> Activating an action calls `action.onClick?.()`. **An action with no `onClick`
> falls back to `props.onAction?.(item)`.**

Today's singular `action` has no `onClick`, so existing consumers keep working
unchanged, and `action` can be deprecated rather than removed. The release is
`feat:`, not `feat!:`.

`onAction` additionally makes the row body clickable, following SUI's
conditionally-interactive pattern (`FocusLabelBand.tsx:64`, `HeatStream.tsx:218`,
`Treemap.tsx:127`): `role`, `tabIndex`, and `onKeyDown` (Enter/Space) are wired
**only** when the handler is present, so a row without `onAction` stays inert and
carries no misleading affordance.

The action row gets a click-isolation barrier so action clicks do not bubble to
the row — the `StatusCard.tsx:194` precedent.

Panel-close resolution, in order: `action.dismissPanel` if set, else `!!href`.
The existing modifier-key guard on anchors (meta/ctrl/shift/alt/non-left-click
returns early, preserving new-tab gestures) is retained unchanged.

## 6. Action row rendering

Resolved actions are `item.actions ?? (item.action ? [item.action] : [])`.
Transient rows render no actions, unchanged.

The row is a `WrapRow` — Toast's action-row geometry, reached through the Layout
variant rather than hand-rolled flex, per the Layout Purity commandment.

Per action:

| Condition | Renders |
|---|---|
| `href` present, not disabled | `Link` with the `→` suffix |
| otherwise | `TextButton tone={action.tone ?? "accent"}` |
| `disabled` | `TextButton` with `disabled`, never an anchor |

Icons render as `Icon size="sm"` with `aria-hidden` inside the control; the
label carries the accessible name.

**The `→` suffix moves to the `href` branch only.** It is currently applied to
both branches (`NotificationCenter.tsx:333`). With several actions in a row an
arrow on each reads as noise, and the arrow means "this navigates" — which is
exactly what `href` distinguishes.

## 7. Prefab action builders (`actions.ts`)

Builders that take the handler, per the `Table/fields/actions.tsx:38`
(`actionCol(id, run)`) precedent. All six are one-liners over the type, which is
itself public — a consumer needing a seventh writes an object literal.

| Builder | Tone | Icon | Closes panel |
|---|---|---|---|
| `viewAction(href, label = "View")` | accent | — | yes (via `href`) |
| `dismissAction(onClick, label = "Dismiss")` | muted | `close` | no |
| `markReadAction(onClick, label = "Mark read")` | muted | `check` | no |
| `acceptAction(onClick, label = "Accept")` | accent | `check` | no |
| `declineAction(onClick, label = "Decline")` | danger | `close` | no |
| `deleteAction(onClick, label = "Delete")` | danger | `trash` | no |

Every glyph is confirmed present in `IconName`. `markReadAction` is the per-item
sibling of the existing `onMarkAllRead` footer, so the two read as a set.
`dismissAction` clears the notification; `deleteAction` destroys the underlying
thing — the consumer owns both effects, SUI only names them.

## 8. Button gains a `danger` tone

`declineAction` and `deleteAction` need a danger-toned *text* button, which does
not exist in SUI today.

`Button` has a danger **variant** (`_baseline.css:316`) but its tone matrix is
`"accent" | "outline" | "muted"` (`Button.tsx:34`), with three rules in
`Button.css` (38/44/49). The variant slot is already spent — `TextButton` is
`createButton({ variant: "text" })` — so the variant path is unreachable for
these buttons.

Per `STYLE_GUIDE.md:92` ("the missing variant is the finding, not an excuse for
an inline style"), the fix is in the atomic, not in `NotificationCenter.css`:

- `Button.tsx`: `tone?: "accent" | "outline" | "muted" | "danger"`
- `Button.css`: `.sui-btn--tone-danger` using `var(--sui-danger)` /
  `var(--sui-danger-rgb)`, mirroring `.sui-btn--tone-accent`

Purely additive; no existing rule changes.

## 9. Module split

`NotificationCenter.tsx` is 376 lines. The additions push it past the 500-line
limit, so it splits by concern as part of this work rather than after review.

| File | Owns |
|---|---|
| `types.ts` | `NotificationItem`, `NotificationAction`, tone unions, props |
| `actions.ts` | the six prefab builders |
| `NotificationRow.tsx` | one row: gutter · well · title row · body · action row |
| `NotificationCenter.tsx` | trigger, overlay positioning, panel shell |
| `NotificationCenter.css` | unchanged carve-out + action-row hooks |
| `index.ts` | re-exports, including the builders and `NotificationAction` |

`NotificationRow` is internal — exported from the module for testing, not from
the package barrel. The public surface stays `NotificationCenter` plus the types
and builders.

## 10. Testing

Extending `NotificationCenter.test.tsx` (304 lines today); row-level cases move
to a sibling `NotificationRow.test.tsx` alongside the split.

**Resolution and rendering**
- `actions` renders one control per entry, in order
- legacy singular `action` renders exactly one control (deprecated path intact)
- `actions` and `action` both present → `actions` wins
- `href` action renders an anchor with the `→` suffix; non-`href` renders a
  button with no suffix
- `disabled` action renders a disabled button even when `href` is set, and does
  not fire on click
- `transient` row renders no actions regardless of `actions`
- each tone maps to its `sui-btn--tone-*` class, including `danger`

**Activation**
- `action.onClick` fires; `onAction` does **not** also fire
- an action with no `onClick` falls back to `onAction(item)` — the
  backward-compatibility rule
- panel closes after an `href` action, stays open after a plain `onClick` action
- explicit `dismissPanel` overrides the default in both directions
- modifier-clicking an anchor does not call `onClick` and does not close the
  panel

**Row-body activation**
- with `onAction`, the row carries `role="button"` / `tabIndex` and fires on
  click and on Enter/Space
- without `onAction`, the row carries neither and is inert
- clicking an action does not also fire the row's `onAction` (isolation barrier)

**Body slot**
- `body` renders between the title row and the action row
- a row without `body` renders no empty body container
- `body` is not invoked for items that do not define it
- a signal read inside `body` tracks (the thunk is evaluated in the row's scope)

**Prefabs**
- each builder returns the tone, icon, label, and `dismissPanel` in the §7 table
- each builder's `label` parameter overrides the default
- `viewAction` produces an anchor when rendered

## 11. Showcase

`dev/showcases/notification-center.tsx` gains:

- **A multi-action row** built from the prefabs (`viewAction` + `dismissAction` +
  `markReadAction`), demonstrating that dismiss/mark-read leave the panel open
  while view closes it.
- **An accept/decline row** showing the danger tone.
- **A custom-body row** — the deploy-progress case, with an inline progress
  element in `body`.
- **The `kind`-registry recipe** documented in prose as the consumer-side
  pattern for heterogeneous feeds, with the one-line `map`.

The existing examples are retained unchanged, which doubles as a live check that
the deprecated singular `action` still works.

## 12. Release

- `CHANGELOG.md` under `[Unreleased]`: **Added** — `NotificationItem.actions`,
  `NotificationItem.body`, the six builders, `Button` `tone="danger"`;
  **Changed** — `onAction` widens to row-body activation, the `→` suffix narrows
  to the `href` branch; **Deprecated** — `NotificationItem.action`.
- `COMPONENTS.md` entry updated for the new surface.
- Minor version bump. `feat:`, not `feat!:` — §5 is what earns that.
