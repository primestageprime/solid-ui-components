# Arbitrary Workshop Benches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an arbitrary number of in-progress component benches coexist under `dev/showcases/workshop/`, auto-discovered by the dev gallery, so multiple Claudes can prototype SUI components simultaneously without clobbering each other.

**Architecture:** Keep the existing master workshop (`dev/showcases/workshop.tsx`) and its registration untouched. Add a sibling **folder** `dev/showcases/workshop/` whose `*.tsx` files each default-export a `Component`; `dev/main.tsx` discovers them with `import.meta.glob` and renders them as nav items alongside the master. A `/workshop` skill backed by three node scripts (`workshop-new` / `workshop-list` / `workshop-remove`) scaffolds, lists, and tears down benches. One shared checkout, one dev server — git discipline (stage only your own bench path) is reinforced by the skill.

**Tech Stack:** SolidJS, Vite (`import.meta.glob`), TypeScript, Vitest (jsdom), Node ESM scripts (`.mjs`).

**Spec:** `docs/superpowers/specs/2026-05-28-arbitrary-workshops-design.md`

---

### Task 1: Bench discovery helpers (`dev/workshop-benches.ts`)

Pure functions the gallery uses to turn glob results into nav items. No DOM, no Vite — just data mapping, so they're unit-testable under the existing `dev/**` vitest glob.

**Files:**
- Create: `dev/workshop-benches.ts`
- Test: `dev/workshop-benches.test.ts`

- [ ] **Step 1: Write the failing test**

Create `dev/workshop-benches.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slugToTitle, buildWorkshopItems, type BenchModule } from "./workshop-benches";

const stub = (): any => () => null; // stand-in Component

describe("slugToTitle", () => {
  it("title-cases a kebab slug", () => {
    expect(slugToTitle("scrub-chart")).toBe("Scrub Chart");
  });
  it("handles a single word", () => {
    expect(slugToTitle("fisheye")).toBe("Fisheye");
  });
});

describe("buildWorkshopItems", () => {
  it("maps each module to a workshop-tagged item with id workshop:<slug>", () => {
    const modules: Record<string, BenchModule> = {
      "./showcases/workshop/scrub-chart.tsx": { default: stub() },
    };
    const items = buildWorkshopItems(modules);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "workshop:scrub-chart",
      label: "Scrub Chart",
      tags: ["workshop"],
    });
    expect(typeof items[0].component).toBe("function");
  });

  it("prefers meta.label over the slug", () => {
    const modules: Record<string, BenchModule> = {
      "./showcases/workshop/sc.tsx": { default: stub(), meta: { label: "Scrub Chart" } },
    };
    expect(buildWorkshopItems(modules)[0].label).toBe("Scrub Chart");
  });

  it("sorts by meta.order then label", () => {
    const modules: Record<string, BenchModule> = {
      "./showcases/workshop/beta.tsx": { default: stub() },
      "./showcases/workshop/alpha.tsx": { default: stub() },
      "./showcases/workshop/first.tsx": { default: stub(), meta: { order: -1 } },
    };
    expect(buildWorkshopItems(modules).map((i) => i.id)).toEqual([
      "workshop:first",
      "workshop:alpha",
      "workshop:beta",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run dev/workshop-benches.test.ts`
Expected: FAIL — cannot resolve `./workshop-benches`.

- [ ] **Step 3: Write the implementation**

Create `dev/workshop-benches.ts`:

```ts
import type { Component } from "solid-js";

export type BenchMeta = { label?: string; order?: number };
export type BenchModule = { default: Component; meta?: BenchMeta };

/** A nav item for a discovered workshop bench. Structurally matches main.tsx's `Item`. */
export type WorkshopBenchItem = {
  id: string;
  label: string;
  component: Component;
  tags: string[];
};

/** "scrub-chart" -> "Scrub Chart" */
export const slugToTitle = (slug: string): string =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const slugFromPath = (path: string): string => path.match(/\/([^/]+)\.tsx$/)![1];

/** Map `import.meta.glob` results to sorted, workshop-tagged nav items. */
export const buildWorkshopItems = (
  modules: Record<string, BenchModule>,
): WorkshopBenchItem[] =>
  Object.entries(modules)
    .map(([path, mod]) => {
      const slug = slugFromPath(path);
      return {
        item: {
          id: `workshop:${slug}`,
          label: mod.meta?.label ?? slugToTitle(slug),
          component: mod.default,
          tags: ["workshop"],
        },
        order: mod.meta?.order ?? 0,
      };
    })
    .sort((a, b) => a.order - b.order || a.item.label.localeCompare(b.item.label))
    .map((e) => e.item);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run dev/workshop-benches.test.ts`
Expected: PASS (5 assertions across 3 describes).

- [ ] **Step 5: Commit**

```bash
git add dev/workshop-benches.ts dev/workshop-benches.test.ts
git commit -m "feat(workshop): bench discovery helpers (slugToTitle, buildWorkshopItems)"
```

---

### Task 2: Wire discovery + nav rendering into `dev/main.tsx`

Additive only — the master workshop import, its `items` entry, and its sidebar button stay exactly as they are.

**Files:**
- Modify: `dev/main.tsx` (import at top ~line 1-20; `items` literal at `:123`; sidebar at `:385-392`)

- [ ] **Step 1: Add the import**

Near the other top-level imports in `dev/main.tsx` (after the `WorkshopShowcase` import at `:118`), add:

```ts
import { buildWorkshopItems, type BenchModule } from "./workshop-benches";
```

- [ ] **Step 2: Discover benches and splice them into `items`**

Immediately **above** the `const items: Item[] = [` declaration (`:123`), add the glob:

```ts
// Auto-discovered workshop benches (dev/showcases/workshop/*.tsx). Each file
// default-exports a Component; new benches appear here with no registration edit.
const workshopBenchItems = buildWorkshopItems(
  import.meta.glob<BenchModule>("./showcases/workshop/*.tsx", { eager: true }),
);
```

Then, inside the `items` array, add a single spread line directly after the master workshop entry (`:126`):

```ts
  { id: "workshop", label: "Workshop", component: WorkshopShowcase, tags: ["workshop"] },
  ...workshopBenchItems,
```

(`WorkshopBenchItem` is structurally compatible with `Item`, so the spread type-checks.)

- [ ] **Step 3: Render bench rows in the sidebar**

In the sidebar, directly after the master Workshop `<button>` block (closes at `:392`) and before the "Layouts →" button (`:394`), add:

```tsx
        <For each={workshopBenchItems}>
          {(bench) => (
            <button
              type="button"
              class={`workshop-link workshop-link--bench ${activeId() === bench.id ? "workshop-link--active" : ""}`}
              onClick={() => navigate(bench.id)}
              title="Workshop bench (in-progress component)"
            >
              {bench.label}
            </button>
          )}
        </For>
```

(`For` and `navigate` are already imported / in scope.)

- [ ] **Step 4: Add the bench-row indent style**

Append to `dev/main.css`:

```css
.workshop-link--bench {
  padding-left: 24px;
  font-size: 12px;
}
```

- [ ] **Step 5: Smoke-test in the dev server**

Note: `tsconfig.json` includes only `src/**/*`, so `tsc --noEmit` does **not**
check `dev/` — the dev gallery is type-checked by the editor/LSP, and Vite
catches only resolution/syntax/JSX errors at transform time. So verify by
running the gallery:

Run: `npm run dev` (port 6006). Confirm:
- The terminal shows no Vite transform errors and the page renders.
- The gallery looks unchanged (the glob folder doesn't exist yet, so
  `import.meta.glob` resolves to `{}`, `workshopBenchItems` is `[]`, and no
  extra sidebar rows appear).

Stop the server. (Task 4 exercises the populated-folder path end-to-end.)

- [ ] **Step 6: Commit**

```bash
git add dev/main.tsx dev/main.css
git commit -m "feat(workshop): auto-discover benches from workshop/ folder in gallery"
```

---

### Task 3: Script helper library (`scripts/workshop-lib.mjs`)

Pure node-ESM helpers shared by the three CLI scripts. Tested via Vitest after adding `scripts/**` to the include globs.

**Files:**
- Modify: `vitest.config.ts` (`include` array at `:56-59`)
- Create: `scripts/workshop-lib.mjs`
- Test: `scripts/workshop-lib.test.ts`

- [ ] **Step 1: Extend the vitest include glob**

In `vitest.config.ts`, add a third entry to `include`:

```ts
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "dev/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/*.{test,spec}.{ts,tsx}",
    ],
```

- [ ] **Step 2: Write the failing test**

Create `scripts/workshop-lib.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  isValidSlug,
  slugToTitle,
  slugToPascal,
  renderBenchTemplate,
} from "./workshop-lib.mjs";

describe("isValidSlug", () => {
  it("accepts kebab-case", () => {
    expect(isValidSlug("scrub-chart")).toBe(true);
    expect(isValidSlug("fisheye")).toBe(true);
  });
  it("rejects non-kebab", () => {
    expect(isValidSlug("ScrubChart")).toBe(false);
    expect(isValidSlug("scrub_chart")).toBe(false);
    expect(isValidSlug("scrub chart")).toBe(false);
    expect(isValidSlug("-lead")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("slugToTitle / slugToPascal", () => {
  it("title-cases", () => {
    expect(slugToTitle("scrub-chart")).toBe("Scrub Chart");
  });
  it("pascal-cases", () => {
    expect(slugToPascal("scrub-chart")).toBe("ScrubChart");
  });
});

describe("renderBenchTemplate", () => {
  it("produces a default-exported bench with meta.label and matching names", () => {
    const out = renderBenchTemplate({ slug: "scrub-chart", label: "Scrub Chart" });
    expect(out).toContain('export const meta = { label: "Scrub Chart" };');
    expect(out).toContain("const ScrubChartBench: Component");
    expect(out).toContain("export default ScrubChartBench;");
    expect(out).toContain('from "../../../src/components/Text"');
    expect(out).toContain("<SectionTitle>Scrub Chart</SectionTitle>");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/workshop-lib.test.ts`
Expected: FAIL — cannot resolve `./workshop-lib.mjs`.

- [ ] **Step 4: Write the implementation**

Create `scripts/workshop-lib.mjs`:

```js
export const isValidSlug = (slug) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);

export const slugToTitle = (slug) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const slugToPascal = (slug) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

export const renderBenchTemplate = ({ slug, label }) => {
  const pascal = slugToPascal(slug);
  return `import { Component } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";

export const meta = { label: ${JSON.stringify(label)} };

const ${pascal}Bench: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle>${label}</SectionTitle>
    {/* build here */}
  </div>
);

export default ${pascal}Bench;
`;
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run scripts/workshop-lib.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts scripts/workshop-lib.mjs scripts/workshop-lib.test.ts
git commit -m "feat(workshop): pure helpers for bench scaffolding scripts"
```

---

### Task 4: `workshop-new` CLI (`scripts/workshop-new.mjs`)

Scaffolds a bench file; refuses to overwrite an existing one (the no-clobber guarantee).

**Files:**
- Create: `scripts/workshop-new.mjs`

- [ ] **Step 1: Write the script**

Create `scripts/workshop-new.mjs`:

```js
#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isValidSlug, slugToTitle, renderBenchTemplate } from "./workshop-lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const benchDir = join(repoRoot, "dev/showcases/workshop");

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith("--"));
const labelIdx = argv.indexOf("--label");
const label = labelIdx !== -1 ? argv[labelIdx + 1] : undefined;

const fail = (msg) => {
  console.error(`workshop-new: ${msg}`);
  console.error("usage: node scripts/workshop-new.mjs <kebab-slug> [--label \"Nice Label\"]");
  process.exit(1);
};

if (!slug) fail("missing <slug>");
if (!isValidSlug(slug)) fail(`"${slug}" is not a kebab-case slug (a-z, 0-9, hyphen)`);

mkdirSync(benchDir, { recursive: true });
const filePath = join(benchDir, `${slug}.tsx`);
if (existsSync(filePath)) {
  fail(`bench already exists at dev/showcases/workshop/${slug}.tsx — refusing to overwrite`);
}

writeFileSync(filePath, renderBenchTemplate({ slug, label: label ?? slugToTitle(slug) }));
console.log(`Created dev/showcases/workshop/${slug}.tsx`);
console.log(`Nav id: workshop:${slug}`);
```

- [ ] **Step 2: Run it — happy path**

Run: `node scripts/workshop-new.mjs demo-bench --label "Demo Bench"`
Expected: prints `Created dev/showcases/workshop/demo-bench.tsx` and `Nav id: workshop:demo-bench`. Verify with `cat dev/showcases/workshop/demo-bench.tsx` — it default-exports `DemoBenchBench` with `meta.label "Demo Bench"`.

- [ ] **Step 3: Run it again — verify no-clobber**

Run: `node scripts/workshop-new.mjs demo-bench`
Expected: exits non-zero with `bench already exists ... refusing to overwrite`. The existing file is unchanged.

- [ ] **Step 4: Run it with a bad slug**

Run: `node scripts/workshop-new.mjs DemoBench`
Expected: exits non-zero with the kebab-case error + usage.

- [ ] **Step 5: Verify it appears in the gallery, then clean up**

Run: `npm run dev`, confirm a "Demo Bench" row appears under the Workshop link and renders the bench. Stop the server. Then remove the scratch bench:

```bash
rm dev/showcases/workshop/demo-bench.tsx
```

- [ ] **Step 6: Commit**

```bash
git add scripts/workshop-new.mjs
git commit -m "feat(workshop): workshop-new CLI scaffolds a bench, refuses to clobber"
```

---

### Task 5: `workshop-list` and `workshop-remove` CLIs

**Files:**
- Create: `scripts/workshop-list.mjs`
- Create: `scripts/workshop-remove.mjs`

- [ ] **Step 1: Write `workshop-list.mjs`**

Create `scripts/workshop-list.mjs`:

```js
#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { slugToTitle } from "./workshop-lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const benchDir = join(repoRoot, "dev/showcases/workshop");

const slugs = existsSync(benchDir)
  ? readdirSync(benchDir)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => f.replace(/\.tsx$/, ""))
      .sort()
  : [];

if (slugs.length === 0) {
  console.log("No workshop benches. Create one: node scripts/workshop-new.mjs <slug>");
} else {
  console.log(`${slugs.length} bench(es):`);
  for (const slug of slugs) console.log(`  workshop:${slug}  (${slugToTitle(slug)})`);
}
```

- [ ] **Step 2: Write `workshop-remove.mjs`**

Create `scripts/workshop-remove.mjs`:

```js
#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { isValidSlug } from "./workshop-lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const benchDir = join(repoRoot, "dev/showcases/workshop");

const slug = process.argv[2];
if (!slug || !isValidSlug(slug)) {
  console.error("usage: node scripts/workshop-remove.mjs <kebab-slug>");
  process.exit(1);
}

const filePath = join(benchDir, `${slug}.tsx`);
if (!existsSync(filePath)) {
  console.warn(`workshop-remove: no bench at dev/showcases/workshop/${slug}.tsx (nothing to do)`);
  process.exit(0);
}

unlinkSync(filePath);
console.log(`Removed dev/showcases/workshop/${slug}.tsx`);
```

- [ ] **Step 3: Manual round-trip test**

```bash
node scripts/workshop-new.mjs round-trip
node scripts/workshop-list.mjs        # shows "workshop:round-trip  (Round Trip)"
node scripts/workshop-remove.mjs round-trip   # "Removed ..."
node scripts/workshop-list.mjs        # "No workshop benches."
node scripts/workshop-remove.mjs round-trip   # warns "nothing to do", exit 0
```

Expected: output matches the comments above.

- [ ] **Step 4: Commit**

```bash
git add scripts/workshop-list.mjs scripts/workshop-remove.mjs
git commit -m "feat(workshop): workshop-list and workshop-remove CLIs"
```

---

### Task 6: `/workshop` skill

**Files:**
- Create: `.claude/skills/workshop/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `.claude/skills/workshop/SKILL.md`:

```markdown
---
name: workshop
description: Use when spinning up an isolated workshop bench to prototype an SUI component without clobbering other agents — for "/workshop <name>", "spin up a workshop", "new bench", "list benches", "remove a bench". Backs onto scripts/workshop-{new,list,remove}.mjs; benches auto-appear in the dev gallery (npm run dev, port 6006) under the Workshop link.
---

# Workshop benches (parallel prototyping)

The dev gallery has one **master** workshop (`dev/showcases/workshop.tsx`) plus
an arbitrary number of **benches** under `dev/showcases/workshop/<slug>.tsx`.
Each bench is its own file, auto-discovered by `dev/main.tsx` — so multiple
Claudes can each prototype a component on their own bench at the same time
without touching the same file or any shared registration block.

This is the front half of the build loop:

> `/workshop <name>` → build on the bench → iterate until the API is settled → `/promote` → done.

## Commands

- **Create:** `/workshop <name>` → `node scripts/workshop-new.mjs <slug> [--label "Nice Label"]`
  - `<slug>` must be kebab-case (`a-z`, `0-9`, hyphen). The script **refuses to
    overwrite** an existing bench, so you can never clobber another agent's work.
  - Writes `dev/showcases/workshop/<slug>.tsx` (a default-exported `Component`
    with a `meta.label`) and prints the nav id `workshop:<slug>`.
- **List:** `/workshop list` → `node scripts/workshop-list.mjs`
- **Remove:** `/workshop remove <name>` → `node scripts/workshop-remove.mjs <slug>`
  (teardown for an abandoned bench; promotion is handled by `/promote`).

## Steps for `/workshop <name>`

1. Derive a kebab-case `<slug>` from the requested name (e.g. "Scrub Chart" → `scrub-chart`).
2. Run `node scripts/workshop-new.mjs <slug> --label "<Nice Label>"`. If it
   reports the bench already exists, stop and tell the user — do not overwrite.
3. Tell the user the bench is live: it appears in the gallery under the
   **Workshop** link at `npm run dev` (port 6006), nav id `workshop:<slug>`.
   Build the prototype component in `dev/showcases/workshop/<slug>.tsx`.

## Git discipline (shared checkout)

All agents share one checkout and one git index. **Stage only your own bench
path** — never `git add -A`:

```bash
git add dev/showcases/workshop/<slug>.tsx src/components/<Name>/
```

Committing `-A` would sweep up other agents' in-flight benches.
```

- [ ] **Step 2: Verify the skill loads**

Run: `/workshop list` in a fresh Claude Code session (or confirm the file parses — frontmatter `name` + `description` present, matching the `promote` skill shape).
Expected: the skill is recognized and runs `workshop-list.mjs`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/workshop/SKILL.md
git commit -m "feat(workshop): /workshop skill for spinning up parallel benches"
```

---

## Notes / follow-ups (not in this plan)

- **`/promote` generalization:** the `promote` skill targets `dev/showcases/workshop.tsx` (singular). Once benches are in use it should also accept `dev/showcases/workshop/<slug>.tsx`. Flagged in the spec; do separately.
- `meta.order` is supported by `buildWorkshopItems` but the scaffold template doesn't emit it — set it by hand in a bench if ordering matters.
