# ListItem Workshop Design Principles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Peter's six design principles to the `ListItem` prototype on the workshop bench (`dev/showcases/workshop/list-item.tsx`), one principle per task.

**Architecture:** Everything lives in the single bench file — the prototype component, its scratch CSS (a `benchCss` string injected via `<style>`), and the demo sections. The drag grip belongs to `SortableList` (`src/components/SortableList/`), so hover-reveal of the grip is done with bench-scoped CSS targeting `.sui-sortable-list__grip` — do NOT modify SortableList itself during the workshop phase.

**Tech Stack:** SolidJS, SUI theme tokens (`--sui-*`), existing SUI components (`SmAvatar`, `SortableList`).

## Global Constraints

- This is a WORKSHOP BENCH — no `src/` files are created or modified. All changes go in `dev/showcases/workshop/list-item.tsx`.
- No test harness exists for benches. Verification per task = `npx tsc --noEmit -p tsconfig.json` passes with no output, plus a visual review by the dispatching session (screenshots at `http://localhost:6006/#/workshop:list-item`).
- Stage ONLY the bench file: `git add dev/showcases/workshop/list-item.tsx`. NEVER `git add -A` (shared checkout — other agents' benches may be in flight).
- All colors/spacing via `--sui-*` tokens with px fallbacks, matching the existing `benchCss` style.
- Data props only — no size/variant/tone knobs on `ListItem` (SUI currying rule).
- Hover must NEVER change row geometry (Principle 3 applies to every task): reveal with `opacity`/`visibility`, never `display: none` → `display: flex`, and never add borders/padding on hover.

---

### Task 1: Remove the index — sort order implies the number

**Files:**
- Modify: `dev/showcases/workshop/list-item.tsx`

**Interfaces:**
- Produces: `ListItemProps` WITHOUT `index` — later tasks rely on this exact shape:
  ```ts
  interface ListItemProps {
    title: string;
    avatar?: { initials: string; color?: string };
    tags?: ListItemTag[];
    status?: string;
    onDismiss?: () => void;
  }
  ```

- [ ] **Step 1: Remove the index prop and rendering**

Delete `index?: number;` from `ListItemProps`. Delete this block from the `ListItem` component body:

```tsx
    <Show when={props.index != null}>
      <span class="ws-list-item__index">{props.index}.</span>
    </Show>
```

- [ ] **Step 2: Remove the index CSS**

Delete the `.ws-list-item__index { ... }` rule from `benchCss`.

- [ ] **Step 3: Remove all index usages in the bench demos**

Remove every `index={...}` attribute from the demo `<ListItem>` calls (anatomy section, progressive-slots section, and the SortableList `renderItem`). In the SortableList section, also delete the now-unused index computation `index={tasks().findIndex((x) => x.id === t.id) + 1}`. Update the "Progressive slots" demo row `title="with index"` — delete that whole `<ListItem>` line since the slot no longer exists. Update the anatomy `MutedBody` copy to: `All slots: title, avatar, tags (one active), status, dismiss.`

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add dev/showcases/workshop/list-item.tsx
git commit -m "workshop(list-item): drop index slot — sort order implies the number"
```

---

### Task 2: Grip and dismiss only visible on hover

**Files:**
- Modify: `dev/showcases/workshop/list-item.tsx`

**Interfaces:**
- Consumes: `ListItemProps` from Task 1.
- Produces: no API change. CSS contract: `.ws-list-item__dismiss` is `opacity: 0` at rest, `opacity: 1` when `.ws-list-item:hover`; `.sui-sortable-list__grip` is `opacity: 0` at rest and `opacity: 0.45` on row hover, scoped under `.ws-bench-stack` only.

- [ ] **Step 1: Hide dismiss at rest, reveal on row hover**

In `benchCss`, add to the existing `.ws-list-item__dismiss` rule:

```css
  opacity: 0;
  transition: opacity 0.12s ease;
```

And add a new rule (keep the existing `:hover` color rule for the button itself):

```css
.ws-list-item:hover .ws-list-item__dismiss,
.ws-list-item__dismiss:focus-visible {
  opacity: 1;
}
```

The `:focus-visible` clause keeps the button reachable by keyboard.

- [ ] **Step 2: Hide the SortableList grip at rest, bench-scoped**

Add to `benchCss` (scoped under `.ws-bench-stack` so it only affects this bench, and note it as a promotion decision):

```css
/* PROMOTION NOTE: grip hover-reveal belongs to SortableList (or a row option)
   when this graduates; bench-scoped override for now. */
.ws-bench-stack .sui-sortable-list__grip {
  opacity: 0;
  transition: opacity 0.12s ease;
}
.ws-bench-stack .sui-sortable-list__row:hover .sui-sortable-list__grip {
  opacity: 0.45;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add dev/showcases/workshop/list-item.tsx
git commit -m "workshop(list-item): grip and dismiss reveal on hover only"
```

---

### Task 3: Hover never changes row geometry

**Files:**
- Modify: `dev/showcases/workshop/list-item.tsx`

**Interfaces:**
- Consumes: hover-reveal CSS from Task 2.
- Produces: no API change. Invariant: every hover-revealed element occupies identical space at rest (opacity-based reveal, fixed dimensions); no hover rule alters border-width, padding, margin, font, or size.

- [ ] **Step 1: Audit and fix every hover rule in `benchCss`**

Because Task 2 used `opacity` (not `display`/`width`), the grip and dismiss already hold their space. Verify and enforce the rest:

1. `.ws-list-item__dismiss` must keep its fixed `width: 24px; height: 24px;` at rest (it does — leave as is).
2. `.ws-list-item__dismiss:hover` changes only `border-color` and `color` — both geometry-neutral (border-width stays 1px). Leave as is.
3. Add an explicit invariant comment at the top of `benchCss` so future tasks preserve it:

```css
/* INVARIANT (principle 3): hover reveals via opacity only — never display,
   width, padding, border-width, or font changes. Row geometry is identical
   at rest and on hover. */
```

- [ ] **Step 2: Guard the SortableList row hover**

`SortableList.css` already only brightens `border-color` on row hover (no geometry change) — no bench override needed. Confirm by reading `src/components/SortableList/SortableList.css` (the `.sui-sortable-list__row:hover` rule) and note the finding in the commit message.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add dev/showcases/workshop/list-item.tsx
git commit -m "workshop(list-item): lock hover-stability invariant — opacity-only reveals, constant geometry"
```

---

### Task 4: Tags follow 1, 2, many — collapse the tail into (+N)

> **SKIPPED (2026-07-02, Peter):** doesn't apply yet. Was implemented and then
> reverted (commit ab4d99a dropped). If revived, Task 5's `TagPill` will already
> exist — apply the grouping around it instead of the plain span.

**Files:**
- Modify: `dev/showcases/workshop/list-item.tsx`

**Interfaces:**
- Consumes: `ListItemProps` from Task 1.
- Produces: extended tag type and a render helper later tasks build on:
  ```ts
  interface ListItemTag {
    label: string;
    active?: boolean;
    /** Grouping key for the 1,2,many rule; tags with no kind share the "" group. */
    kind?: string;
  }
  ```
  Per `kind` group: first 2 tags render as pills, remaining N collapse into one muted `+N` pill whose `title` attribute lists the hidden labels. If any collapsed tag is `active`, the `+N` pill renders in the active style (a filter match must never be invisible).

- [ ] **Step 1: Extend the tag type and add the grouping helper**

Add `kind?: string` to `ListItemTag`. Above the `ListItem` component, add:

```tsx
interface TagDisplay {
  visible: ListItemTag[];
  overflow: ListItemTag[];
}

/** 1,2,many per kind: first two of each kind show in detail, the rest
 * collapse into a (+N) pill per kind. Preserves input order. */
const groupTags = (tags: ListItemTag[]): TagDisplay[] => {
  const groups = new Map<string, TagDisplay>();
  for (const tag of tags) {
    const key = tag.kind ?? "";
    let g = groups.get(key);
    if (!g) {
      g = { visible: [], overflow: [] };
      groups.set(key, g);
    }
    (g.visible.length < 2 ? g.visible : g.overflow).push(tag);
  }
  return [...groups.values()];
};
```

- [ ] **Step 2: Render grouped tags with the overflow pill**

Replace the existing `<For each={props.tags ?? []}>` block inside `ListItem` with:

```tsx
      <For each={groupTags(props.tags ?? [])}>
        {(group) => (
          <>
            <For each={group.visible}>
              {(tag) => (
                <span
                  class="ws-list-item__tag"
                  classList={{ "ws-list-item__tag--active": tag.active }}
                >
                  {tag.label}
                </span>
              )}
            </For>
            <Show when={group.overflow.length > 0}>
              <span
                class="ws-list-item__tag ws-list-item__tag--overflow"
                classList={{
                  "ws-list-item__tag--active": group.overflow.some((t) => t.active),
                }}
                title={group.overflow.map((t) => t.label).join(", ")}
              >
                +{group.overflow.length}
              </span>
            </Show>
          </>
        )}
      </For>
```

- [ ] **Step 3: Style the overflow pill**

Add to `benchCss`:

```css
.ws-list-item__tag--overflow {
  font-variant-numeric: tabular-nums;
  cursor: default;
}
```

- [ ] **Step 4: Add a bench demo for the collapse**

In the "Progressive slots" section, add a row demonstrating the rule (5 tags of one kind → 2 visible + `+3`, plus a second kind untouched):

```tsx
        <ListItem
          title="1,2,many — five 'project' tags collapse to two + (+3)"
          tags={[
            { label: "stax", kind: "project", active: true },
            { label: "jtf", kind: "project" },
            { label: "dside", kind: "project" },
            { label: "rhinotools", kind: "project" },
            { label: "thorcasting", kind: "project" },
            { label: "urgent", kind: "flag" },
          ]}
          status="TODO"
          onDismiss={() => {}}
        />
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add dev/showcases/workshop/list-item.tsx
git commit -m "workshop(list-item): 1,2,many tag collapse — first two per kind, tail as +N"
```

---

### Task 5: Composite tags — company:product split lozenge

**Files:**
- Modify: `dev/showcases/workshop/list-item.tsx`

**Interfaces:**
- Consumes: `ListItemTag` + `groupTags` from Task 4.
- Produces: a tag whose `label` contains `:` renders as a split lozenge — one pill with two segments divided by an internal hairline; left segment (namespace) dimmed, right segment (value) normal. `active` styles the whole lozenge. Counts as ONE tag for the 1,2,many rule (no change to `groupTags`).

- [ ] **Step 1: Add a tag-pill render helper**

Both `group.visible` pills and (unchanged) the overflow pill flow through the tag markup, so extract a helper above `ListItem` and use it inside the `<For each={group.visible}>`:

```tsx
const TagPill: Component<{ tag: ListItemTag }> = (props) => {
  const splitAt = () => props.tag.label.indexOf(":");
  return (
    <Show
      when={splitAt() > 0}
      fallback={
        <span
          class="ws-list-item__tag"
          classList={{ "ws-list-item__tag--active": props.tag.active }}
        >
          {props.tag.label}
        </span>
      }
    >
      <span
        class="ws-list-item__tag ws-list-item__tag--split"
        classList={{ "ws-list-item__tag--active": props.tag.active }}
      >
        <span class="ws-list-item__tag-ns">
          {props.tag.label.slice(0, splitAt())}
        </span>
        <span class="ws-list-item__tag-val">
          {props.tag.label.slice(splitAt() + 1)}
        </span>
      </span>
    </Show>
  );
};
```

Then replace the plain `<span class="ws-list-item__tag" ...>` inside `<For each={group.visible}>` with `<TagPill tag={tag} />`. Leave the overflow pill markup as-is.

- [ ] **Step 2: Style the split lozenge**

Add to `benchCss`:

```css
.ws-list-item__tag--split {
  display: inline-flex;
  align-items: stretch;
  padding: 0;
  overflow: hidden;
}
.ws-list-item__tag-ns,
.ws-list-item__tag-val {
  padding: 1px 8px;
}
.ws-list-item__tag-ns {
  color: var(--sui-text-muted);
  background: var(--sui-bg-tertiary);
  border-right: 1px solid var(--sui-border);
}
.ws-list-item__tag--split.ws-list-item__tag--active .ws-list-item__tag-ns {
  border-right-color: var(--sui-accent);
  background: rgba(var(--sui-accent-rgb), 0.2);
}
```

(The base `.ws-list-item__tag` padding of `1px 10px` is zeroed on the split variant; each segment carries its own padding so the hairline runs full height.)

- [ ] **Step 3: Add a bench demo**

Add to the "Progressive slots" section:

```tsx
        <ListItem
          title="composite tag — company:product split lozenge"
          tags={[
            { label: "primestage:thorcasting", active: true },
            { label: "primestage:dside" },
            { label: "stax" },
          ]}
          status="TODO"
          onDismiss={() => {}}
        />
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add dev/showcases/workshop/list-item.tsx
git commit -m "workshop(list-item): composite company:product tags render as split lozenges"
```

---

### Task 6: Status left of the title, fixed width, hover-editable (text edit + select)

**Files:**
- Modify: `dev/showcases/workshop/list-item.tsx`

**Interfaces:**
- Consumes: `ListItemProps` from Task 1, hover invariant from Task 3.
- Produces:
  ```ts
  interface ListItemProps {
    title: string;
    avatar?: { initials: string; color?: string };
    tags?: ListItemTag[];
    status?: string;
    /** Known statuses; drives the select menu AND the fixed chip width (longest option). */
    statusOptions?: string[];
    /** Called when the user edits (free text) or selects a status. When absent the chip is inert. */
    onStatusChange?: (status: string) => void;
    onDismiss?: () => void;
  }
  ```
  Interpretation (recorded for review): the status chip has TWO hover-revealed click regions — clicking the **text itself** swaps in an inline `<input>` covering only the text; clicking the **caret region** at the chip's right edge opens a select menu of `statusOptions`. The chip's width is fixed to the longest option (in `ch`, mono font) so neither hover, editing, nor a shorter status changes geometry.

- [ ] **Step 1: Move status to the left of the title**

In the `ListItem` JSX, move the status block out of `.ws-list-item__meta` to before `.ws-list-item__title` (first child of the row). Render it via a new `StatusChip` component:

```tsx
    <Show when={props.status}>
      <StatusChip
        status={props.status!}
        options={props.statusOptions}
        onChange={props.onStatusChange}
        title={props.title}
      />
    </Show>
    <span class="ws-list-item__title">{props.title}</span>
```

- [ ] **Step 2: Implement `StatusChip`**

Add above `ListItem`:

```tsx
const StatusChip: Component<{
  status: string;
  options?: string[];
  onChange?: (s: string) => void;
  title: string;
}> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const options = () => props.options ?? [];
  // Fixed width: longest option (or current status), in ch of the mono font.
  const widthCh = () =>
    Math.max(props.status.length, ...options().map((o) => o.length)) + 1;
  const commit = (value: string) => {
    setEditing(false);
    setMenuOpen(false);
    const v = value.trim();
    if (v && v !== props.status) props.onChange?.(v);
  };
  return (
    <span
      class="ws-list-item__status-slot"
      style={{ width: `${widthCh()}ch` }}
    >
      <Show
        when={!editing()}
        fallback={
          <input
            class="ws-list-item__status-input"
            value={props.status}
            ref={(el) => queueMicrotask(() => { el.focus(); el.select(); })}
            onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(e.currentTarget.value);
              if (e.key === "Escape") setEditing(false);
            }}
          />
        }
      >
        <button
          type="button"
          class="ws-list-item__status-text"
          aria-label={`Edit status of ${props.title}`}
          disabled={!props.onChange}
          onClick={() => setEditing(true)}
        >
          {props.status}
        </button>
      </Show>
      <Show when={props.onChange && options().length > 0}>
        <button
          type="button"
          class="ws-list-item__status-caret"
          aria-label={`Select status of ${props.title}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ▾
        </button>
        <Show when={menuOpen()}>
          <div class="ws-list-item__status-menu" role="listbox">
            <For each={options()}>
              {(opt) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={opt === props.status}
                  class="ws-list-item__status-option"
                  classList={{
                    "ws-list-item__status-option--current": opt === props.status,
                  }}
                  onClick={() => commit(opt)}
                >
                  {opt}
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </span>
  );
};
```

Also remove the old `.ws-list-item__status` span from the meta cluster and delete its `<Show when={props.status}>` wrapper there.

- [ ] **Step 3: Style the status slot (geometry-stable)**

Replace the old `.ws-list-item__status` CSS with:

```css
.ws-list-item__status-slot {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: content-box;
  padding: 1px 10px;
  border: 1px solid var(--sui-border);
  border-radius: 999px;
  font-family: var(--sui-font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--sui-text-muted);
  line-height: 1.5;
  white-space: nowrap;
}
.ws-list-item__status-text,
.ws-list-item__status-input {
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  min-width: 0;
  flex: 1 1 auto;
  text-align: left;
  cursor: text;
}
.ws-list-item__status-text:disabled {
  cursor: default;
}
.ws-list-item:hover .ws-list-item__status-text:not(:disabled) {
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}
.ws-list-item__status-input {
  outline: 1px solid var(--sui-accent);
  outline-offset: 1px;
  border-radius: 2px;
}
.ws-list-item__status-caret {
  flex: none;
  width: 1.2ch;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--sui-text-secondary);
  font-size: 0.6875rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.ws-list-item:hover .ws-list-item__status-caret,
.ws-list-item__status-caret:focus-visible {
  opacity: 1;
}
.ws-list-item__status-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 10;
  min-width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sui-bg-elevated);
  border: 1px solid var(--sui-border-bright, var(--sui-border));
  border-radius: var(--sui-radius-sm, 4px);
  padding: 2px;
}
.ws-list-item__status-option {
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 2px;
  padding: 3px 8px;
  color: var(--sui-text-secondary);
  cursor: pointer;
}
.ws-list-item__status-option:hover {
  background: rgba(var(--sui-accent-rgb), 0.15);
  color: var(--sui-text-primary);
}
.ws-list-item__status-option--current {
  color: var(--sui-accent);
}
```

Geometry notes: the slot's `width` is inline (`ch` of the longest option) and the caret has a fixed `1.2ch` box revealed by opacity, so hover/edit/select never move anything (principle 3). The `<input>` replaces only the text button inside the same flex slot — it covers only the text, not the chip.

- [ ] **Step 4: Wire the bench**

Give the bench a shared options list and per-task status state:

```tsx
const STATUS_OPTIONS = ["TODO", "DOING", "BLOCKED", "DONE"];
```

In the `Task` seed data keep `status: "TODO"` as-is. In the bench component add:

```tsx
  const setStatus = (id: string, status: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
```

Pass to every demo `<ListItem>` in the SortableList section:

```tsx
              status={t.status}
              statusOptions={STATUS_OPTIONS}
              onStatusChange={(s) => setStatus(t.id, s)}
```

For the static demo sections, pass `statusOptions={STATUS_OPTIONS}` and a no-op `onStatusChange={() => {}}` on one row (to show the affordances) and leave another row without `onStatusChange` (inert chip) to show the read-only state.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add dev/showcases/workshop/list-item.tsx
git commit -m "workshop(list-item): fixed-width status chip left of title with hover edit/select regions"
```
