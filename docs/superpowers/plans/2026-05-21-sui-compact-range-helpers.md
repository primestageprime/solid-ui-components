# SUI Promotion — Compact Range + Duration Helpers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote two pure-function helpers from `amygdala-ui` into `solid-ui-components`:
1. `formatCompactDuration(ms)` — deterministic compact duration formatter (no wall-clock fallback, keeps minutes past 1d). Replaces the existing `Duration` component's internal logic which drops minutes past 1h and uses a different grammar.
2. `formatCompactRange(start, end)` — keeps start + end timestamps but strips redundant date fields from the end side, then appends the compact duration. `null` end is the ongoing sentinel.

Both ship as standalone exports (called in JSX text positions). The existing `Duration` component is preserved for back-compat; consumers that want the new grammar use the standalone helper.

**Architecture:** Pure functions, no I/O, no SolidJS reactivity. Vanilla `Date` + `Intl.DateTimeFormat` only — matches the existing `DateRangePicker` decision (`src/components/DateRangePicker/DateRangePicker.tsx:8` documents "no Luxon / date-fns"). Hand-assemble the rendered string via `formatToParts` to keep a comma-free `"May 13 11:35"` shape that doesn't drift across locales.

**Tech Stack:** TypeScript, Vitest. No date-library dependency.

**Working directory:** `/Users/aarnold/gits/primestage/solid-ui-components`.

**Source:** Both helpers exist verbatim in `amygdala-ui` (`src/lib/utils/formatDuration.ts` from PR 171 + commit `8b87e9ea`). The promotion preserves the implementation and tests exactly; the only changes are the import path and a docstring tweak.

---

## Pre-flight

### Task 0: Baseline

- [ ] **Step 0.1: Confirm clean working tree on main**

```bash
git status
```
Expected: clean. Latest commit should be `3cbdfdb` or later.

- [ ] **Step 0.2: Confirm SUI uses vanilla `Date` + `Intl.DateTimeFormat` (no date-lib dependency)**

```bash
grep -n 'luxon\|date-fns' package.json
grep -n 'Intl\.DateTimeFormat\|no Luxon' src/components/DateRangePicker/DateRangePicker.tsx
```
Expected: no match for `luxon` or `date-fns` in `package.json`; one or more matches in `DateRangePicker.tsx` documenting the no-date-lib decision. The new helpers must follow this convention — do NOT add a date library.

- [ ] **Step 0.3: Baseline test pass**

```bash
npm test 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 0.4: Create feature branch**

```bash
git switch -c feat/compact-range-helpers
```

---

## Task 1: Write the failing test

**Files:**
- Create: `src/components/Duration/formatCompactRange.test.ts`

The tests mirror amygdala-ui's `src/lib/utils/formatDuration.test.ts` so the behavior is provably identical.

- [ ] **Step 1.1: Write the test file**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatCompactDuration,
  formatCompactRange,
} from "./formatCompactRange";

describe("formatCompactDuration", () => {
  it("renders seconds for spans under one minute", () => {
    expect(formatCompactDuration(45_000)).toBe("45s");
  });

  it("renders minutes for spans under one hour", () => {
    expect(formatCompactDuration(15 * 60_000)).toBe("15m");
  });

  it("renders hours and minutes for spans under one day", () => {
    expect(formatCompactDuration(2 * 60 * 60_000 + 15 * 60_000)).toBe(
      "2h 15m",
    );
  });

  it("drops the minute component when it's zero", () => {
    expect(formatCompactDuration(3 * 60 * 60_000)).toBe("3h");
  });

  it("renders days and hours when both are present", () => {
    expect(formatCompactDuration(2 * 86_400_000 + 5 * 3_600_000)).toBe("2d 5h");
  });

  it("keeps the minute component past one day when hours are zero", () => {
    // 24h + 30m → "1d 30m" (hours = 0)
    expect(formatCompactDuration(86_400_000 + 30 * 60_000)).toBe("1d 30m");
  });

  it("renders bare days when hours and minutes are both zero", () => {
    expect(formatCompactDuration(20 * 86_400_000)).toBe("20d");
  });
});

describe("formatCompactRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("strips date from end when start and end share the same day", () => {
    // Note: `Date` constructor month is 0-indexed (4 = May).
    const start = new Date(2026, 4, 13, 11, 35);
    const end = new Date(2026, 4, 13, 12, 5);
    expect(formatCompactRange(start, end)).toBe("May 13 11:35 → 12:05 · 30m");
  });

  it("strips month from end when start and end share the same month", () => {
    const start = new Date(2026, 4, 13, 11, 35);
    const end = new Date(2026, 4, 14, 12, 5);
    expect(formatCompactRange(start, end)).toBe(
      "May 13 11:35 → 14 12:05 · 1d 30m",
    );
  });

  it("shows full date on both sides when start and end are in different months", () => {
    const start = new Date(2026, 4, 13, 11, 35);
    const end = new Date(2026, 5, 2, 12, 5);
    expect(formatCompactRange(start, end)).toBe(
      "May 13 11:35 → Jun 02 12:05 · 20d 30m",
    );
  });

  it("renders 'ongoing' and computes duration vs. now when end is null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 13, 12, 5));
    const start = new Date(2026, 4, 13, 11, 35);
    expect(formatCompactRange(start, null)).toBe(
      "May 13 11:35 → ongoing · 30m",
    );
  });
});
```

- [ ] **Step 1.2: Run and confirm it fails**

```bash
npx vitest run src/components/Duration/formatCompactRange.test.ts 2>&1 | tail -10
```
Expected: FAIL — `"formatCompactDuration" is not exported from "./formatCompactRange"`.

---

## Task 2: Implement the helpers

**Files:**
- Create: `src/components/Duration/formatCompactRange.ts`

- [ ] **Step 2.1: Write the implementation**

Public surface: `formatCompactDuration(ms)`, `formatCompactRange(start, end)`, `formatStartTimestamp(date)`. The Luxon-specific `COMPACT_RANGE_START_FORMAT` constant is dropped — `formatStartTimestamp` is the replacement export for callers that need to render adjacent timestamps in the same shape.

```ts
/**
 * Shared Intl.DateTimeFormat that emits the four parts we need:
 * short month name, 2-digit day, 24-hour clock hour, 2-digit minute.
 * We hand-assemble the rendered string via `formatToParts` to keep a
 * comma-free `"May 13 11:35"` layout that doesn't drift across locales
 * or runtimes (the default `format()` output inserts a comma in en-US).
 */
const DATETIME_PARTS_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const pick = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string => parts.find((p) => p.type === type)?.value ?? "";

const normalizeHour = (h: string): string => (h === "24" ? "00" : h);

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const sameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/**
 * Format a single timestamp as `"MMM dd HH:mm"` in local time
 * (e.g. `"May 13 11:35"`). Exported so callers that mix custom JSX
 * with `formatCompactRange` output can keep adjacent timestamps in
 * the same shape.
 */
export const formatStartTimestamp = (d: Date): string => {
  const parts = DATETIME_PARTS_FMT.formatToParts(d);
  const month = pick(parts, "month");
  const day = pick(parts, "day");
  const hour = normalizeHour(pick(parts, "hour"));
  const minute = pick(parts, "minute");
  return `${month} ${day} ${hour}:${minute}`;
};

const formatEndTimestamp = (start: Date, end: Date): string => {
  const parts = DATETIME_PARTS_FMT.formatToParts(end);
  const month = pick(parts, "month");
  const day = pick(parts, "day");
  const hour = normalizeHour(pick(parts, "hour"));
  const minute = pick(parts, "minute");

  if (sameDay(start, end)) return `${hour}:${minute}`;
  if (sameMonth(start, end)) return `${day} ${hour}:${minute}`;
  return `${month} ${day} ${hour}:${minute}`;
};

/**
 * Format a duration as a compact, deterministic string. Unlike the
 * `Duration` component:
 *   - never falls back to a wall-clock date range at ≥7d
 *   - keeps a smaller-unit component when the next-larger is zero
 *     (e.g. 24h30m → "1d 30m", not "1d")
 *
 * Output grammar:
 *   - `<60s`   → "Ns"
 *   - `<1h`    → "Nm"
 *   - `<1d`    → "Nh" or "Nh Mm"
 *   - `≥1d`    → "Nd", "Nd Mh", or "Nd Mm"
 *     (hours preferred; minutes shown only when hours are zero — minute
 *     precision over multi-day windows isn't useful for the panes this
 *     serves. Bump to three components if that changes.)
 *
 * Seconds appear only in the `<60s` branch.
 */
export const formatCompactDuration = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const totalHr = Math.floor(totalMin / 60);
  const days = Math.floor(totalHr / 24);
  const hours = totalHr % 24;
  const minutes = totalMin % 60;

  if (totalSec < 60) return `${totalSec}s`;
  if (totalHr < 1) return `${totalMin}m`;
  if (days < 1) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }
  if (hours > 0) return `${days}d ${hours}h`;
  if (minutes > 0) return `${days}d ${minutes}m`;
  return `${days}d`;
};

/**
 * Format a date range compactly, keeping start and end but stripping
 * fields from the end side that the start side already conveys.
 *   - Same day:    "May 13 11:35 → 12:05 · 30m"
 *   - Same month:  "May 13 11:35 → 14 12:05 · 1d 30m"
 *   - Different:   "May 13 11:35 → Jun 02 12:05 · 20d 30m"
 *   - Ongoing:     "May 13 11:35 → ongoing · 30m" (duration vs. Date.now())
 *
 * `end === null` is the ongoing sentinel — matches the
 * "alarm-period.end" convention used by typical consumers.
 */
export const formatCompactRange = (
  start: Date,
  end: Date | null,
): string => {
  const startLabel = formatStartTimestamp(start);

  if (end === null) {
    const durationMs = Date.now() - start.getTime();
    return `${startLabel} → ongoing · ${formatCompactDuration(durationMs)}`;
  }

  const endLabel = formatEndTimestamp(start, end);
  const durationMs = end.getTime() - start.getTime();
  return `${startLabel} → ${endLabel} · ${formatCompactDuration(durationMs)}`;
};
```

- [ ] **Step 2.2: Run tests, confirm all pass**

```bash
npx vitest run src/components/Duration/formatCompactRange.test.ts 2>&1 | tail -10
```
Expected: 11 tests pass (7 duration + 4 range).

- [ ] **Step 2.3: Build the project**

```bash
npm run build 2>&1 | tail -10
```
Expected: client + server builds clean. If the build fails on `import { DateTime } from "luxon"`, check that the existing `DateRangePicker` already imports Luxon and the same import surface is fine.

---

## Task 3: Add the exports to the barrel + top-level index

**Files:**
- Modify: `src/components/Duration/index.ts`
- Modify: `src/index.ts` (or wherever the public surface is declared)

- [ ] **Step 3.1: Update `src/components/Duration/index.ts`**

Current content:
```ts
export { Duration } from "./Duration";
export type { DurationProps } from "./Duration";
```

Replace with:
```ts
export { Duration } from "./Duration";
export type { DurationProps } from "./Duration";
export {
  formatCompactDuration,
  formatCompactRange,
  formatStartTimestamp,
} from "./formatCompactRange";
```

- [ ] **Step 3.2: Verify the top-level barrel re-exports everything from `./components/Duration`**

```bash
grep -n "components/Duration" src/index.ts
```
Expected: one line `export * from './components/Duration';`. If missing, add it.

- [ ] **Step 3.3: Rebuild**

```bash
npm run build 2>&1 | tail -10
```
Expected: clean build.

- [ ] **Step 3.4: Commit code + tests + barrel**

```bash
git add src/components/Duration/formatCompactRange.ts src/components/Duration/formatCompactRange.test.ts src/components/Duration/index.ts
git commit -m "$(cat <<'EOF'
feat(Duration): add formatCompactRange + formatCompactDuration helpers

Pure-function helpers promoted from amygdala-ui's
`src/lib/utils/formatDuration.ts` (PR #171). The existing `Duration`
component is preserved for back-compat; consumers that want
deterministic compact output past 1d (e.g. alarm-period labels with
"start → end · duration" grammar) use the new standalone helpers.

The new helpers differ from the existing Duration component:
- never fall back to a wall-clock date range at ≥7d
- keep a smaller-unit component when the next-larger is zero
  ("1d 30m" for 24h30m, not "1d")

`formatCompactRange` keeps start and end Date instances but strips
redundant date fields from the end side: same-day drops the date,
same-month drops the month, different-month renders both. Appends
the compact duration via formatCompactDuration. Ongoing (end=null)
renders "ongoing" and computes duration vs Date.now().

Tests pin the seven duration grammars and four range branches.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update COMPONENTS.md

**Files:**
- Modify: `COMPONENTS.md`

- [ ] **Step 4.1: Locate the Duration entry**

```bash
grep -n '^## Duration\|^### Duration\|^- \*\*Duration\*\*' COMPONENTS.md
```

- [ ] **Step 4.2: Add a paragraph or sibling entry near Duration**

Add the following near the Duration entry (insert after the existing Duration description; preserve the file's existing heading hierarchy):

```markdown
- **formatCompactDuration(ms)** / **formatCompactRange(start, end)** / **formatStartTimestamp(date)** — Pure-function string helpers exported from `solid-ui-components/Duration`. Vanilla `Date` + `Intl.DateTimeFormat` (no Luxon, matching the DateRangePicker convention). `formatCompactDuration` renders deterministic compact duration strings (`Ns` / `Nm` / `Nh Mm` / `Nd Mh` / `Nd Mm`), no wall-clock fallback. `formatCompactRange(start, end)` keeps both timestamps but strips redundant date fields from the end side (same-day, same-month, different-month branches), appends the duration, and supports `end === null` for ongoing periods. `formatStartTimestamp(date)` exposes the `"MMM dd HH:mm"` shape for callers that need to format adjacent timestamps consistently. Use for: alarm-period labels, history lists, "zoomed to" indicators.
```

If the file uses a different bullet style or heading depth, match it.

- [ ] **Step 4.3: Commit doc update**

```bash
git add COMPONENTS.md
git commit -m "$(cat <<'EOF'
docs(COMPONENTS): document formatCompactRange / formatCompactDuration

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Verify + open the PR

- [ ] **Step 5.1: Full test + build sweep**

```bash
npm test 2>&1 | tail -10
npm run build 2>&1 | tail -10
```
Expected: all tests pass; build clean.

- [ ] **Step 5.2: Push and open PR**

```bash
git push -u origin HEAD
gh pr create --title "feat(Duration): add formatCompactRange + formatCompactDuration" --body "$(cat <<'EOF'
## Summary
- New `formatCompactDuration(ms)`, `formatCompactRange(start, end)`, and `formatStartTimestamp(date)` standalone exports under `solid-ui-components/Duration`
- Vanilla `Date` + `Intl.DateTimeFormat` only — matches the existing `DateRangePicker` "no Luxon / date-fns" decision; no new runtime dependency
- `formatCompactDuration` provides a deterministic compact grammar (`Ns` / `Nm` / `Nh Mm` / `Nd Mh` / `Nd Mm`) — no wall-clock fallback past 7d, keeps the smaller unit when the next-larger is zero
- `formatCompactRange(start, end)` keeps both timestamps but strips redundant end-side date fields and appends the compact duration. `end === null` renders the ongoing sentinel
- `formatStartTimestamp(date)` exposes the `"MMM dd HH:mm"` shape for callers that mix custom JSX with `formatCompactRange` output
- 11 unit tests (7 duration, 4 range) lock the grammar
- The existing `Duration` component is unchanged; consumers that want the new grammar opt in via the standalone helpers

Promoted from amygdala-ui's `src/lib/utils/formatDuration.ts` (commits `36c65e79`, `8b87e9ea`). After this lands, a follow-up amygdala-ui PR will drop the local copies and import from SUI.

## Test plan
- [x] `npm test` passes
- [x] `npm run build` (client + server) clean

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Acceptance criteria

- [ ] `formatCompactRange` + `formatCompactDuration` + `formatStartTimestamp` exported from `solid-ui-components/Duration` and re-exported from the top-level barrel
- [ ] 11 tests pass (7 duration + 4 range)
- [ ] `npm run build` clean (client + server)
- [ ] `COMPONENTS.md` documents the new exports
- [ ] 2 commits (impl + tests; docs), PR opened
