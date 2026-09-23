---
name: sui-agent-brief
description: Use when spawning ANY UI subagent — in SUI itself or in a consumer repo (jtf-ui, thorcasting-ui, amygdala-ui, dside-ui, taskmaster) — to build or prototype a screen. Splice this skill's body into the top of that subagent's prompt, before the task-specific brief. Covers the composition axiom and push-back gate, the 20-minute pixels-first loop, the codegen scripts, the build-loop skills, the trap list that costs an hour each, shared-checkout git rules, and report format. Not for SUI-internal refactor or release work with its own skill (`/refactor-pass`, `/promote`, `/ship`) — those already carry this context.
---

# SUI agent brief (splice into every UI subagent's prompt)

Peter, 2026-09-22: SUI components should be so plug-and-play that building
with SUI takes a fraction of the time hand-rolling would. This is the
standard preamble that primes a UI subagent to actually get that speed,
instead of re-deriving it (or re-breaking it) per brief. Paste the section
below verbatim above the task-specific instructions.

---

## 1. The axiom and the gate

**No component above Depth 1 contains anything but existing SUI
components** — no raw HTML/SVG, no CSS file, no inline `style={}`, no
third-party primitives outside a Primitive. Before creating any component,
variant, or prop expansion:

1. Run `npm run find -- "<what it does>"` (SUI's component-lookup index —
   search by state model, not the name you imagined). Not in `package.json`
   as of 2026-09-22 — if it's missing, grep `COMPONENTS.md` and
   `src/index.ts` instead, and say so in your report.
2. Either **name the existing component** that covers it and use it, or
   **write a 3-line justification** (what mark no Primitive draws / who the
   real shipping consumer is / why an existing Primitive's variant can't
   express it) and **STOP for Peter's confirmation** before writing it.

**A bench, a showcase, or a test is not a consumer.** Only a shipping app
screen is demand. Start with the one variant/size/prop a real caller needs —
never the matrix it could support.

## 2. Land pixels in 20 minutes

Compose the smallest renderable thing from curried variants only, on a
**bench** (`/workshop <name>`) — it appears in **your worktree's** gallery
(`npm run dev`, port 6006) instantly via `import.meta.glob` auto-discovery.
But every subagent works in an isolated worktree, and **Peter looks at
main** — a bench on an unmerged branch is invisible to him, however green.
So open the bench PR with the `bench` label and get it merged the moment
it's green; that's what makes it show up in the gallery Peter actually
looks at. Get his reaction to pixels, not to a description, before
iterating further; spec churn against text is where the hours go (the
License board took ~5 hours and four PRs off a 40-minute brief). (2026-09-18:
two green bench PRs sat unmerged while Peter looked at main and reported
"there's nothing in the SUI workshops" — a merged-but-unlanded bench is the
same as no bench.)

## 3. Use the generators, never hand-build the checklist

`npm run new:component`, `npm run new:variant`, `npm run new:bench` scaffold
the folder/CSS/test/showcase/depth-header shape the ratchet expects. Use
them instead of copying an existing component by hand — a hand-copy is how
a missing depth header or test slips through. (Not in `package.json` as of
2026-09-22 — if `npm run new:component` reports "missing script", scaffold
by copying an existing component's folder shape instead, and say so in your
report; the real gates today are `typecheck:dev`, `test`, `health`,
`bundle-budget`, `build`, and `lint:ci`, and the real catalog is
`COMPONENTS.md` + `src/index.ts` + `dev/main.tsx`.)

## 4. The build loop

`/workshop <name>` → `/sui-build` (or `/promote` for a single settled
component) → `/ship`. Invoke the matching skill at each step rather than
doing its steps inline — each owns gates and git discipline this brief only
summarizes.

## 5. The trap list (one hour each, no explanation longer than the trap)

- Hash routing doesn't reload — open a new tab or `location.reload()`.
- Vite ghost exports after add/rename — `touch` the file, open a **new**
  tab (the old tab's module graph stays poisoned).
- Browser-pane tabs are `visibilityState === "hidden"` — rAF and
  `observeSize`/ResizeObserver freeze. CSS layout numbers are reliable;
  measured/viewBox sizes are not. Peter's own screen is ground truth.
- `<Index>`, not `<For>`, over computed geometry — `<For>` remounts the
  whole SVG on every update (keys are referential).
- Deliver the first size measurement synchronously in `onMount` via
  `getBoundingClientRect` — a ref-time read is 0, and the observer's first
  delivery is wrong (and frozen in hidden tabs).
- Kobalte `step` governs pointer AND keyboard.
- `minmax(0, 1fr)` for any grid track holding a self-measuring child —
  `1fr` is `minmax(auto, 1fr)` and inherits the content floor flexbox can't
  shed.
- `RateGauge` starves its dial to its floor rather than ellipsizing labels
  in a too-narrow measured box.
- An ambiguous `export *` resolves to nothing, silently.
- `npm run gate` is the gate — run it whole, never pipe into `head` (exit
  status is the gate, not the printed tail). Not in `package.json` as of
  2026-09-22 — until it lands, run `typecheck:dev`, `test`, `health`,
  `bundle-budget`, and `build` individually, unpiped.
- Never `npm run build` in the live checkout — it wedges the shared Vite
  cache under a running dev server.
- `execution-coverage` is unmeasurable after a red vitest run.
- `preview_start({name})` resolves `.claude/launch.json` from your
  **primary working directory**. In a SUI worktree that's SUI's
  `launch.json`, whose only entry is `gallery` on 6006 — so asking for any
  other name silently starts a **second** gallery on Peter's port
  (`reused: false`), and stopping "your" mistake kills his. In a SUI
  worktree, never call `preview_start` by name. Need a preview? `pa next`
  for a port, add your **own** uniquely named entry to the `launch.json` of
  the directory you're actually running from, and `preview_stop` only that
  `serverId`. Never touch 6006 or a consumer's live port.
- Run gates in the **foreground**. Launching a gate with `run_in_background`
  and then saying "I'll wait" ends your turn and leaves you idle until
  someone nudges you.

## 6. Git rules for a shared checkout

Branch before your first commit. Stage only your own paths — never
`git add -A`. Never `--amend` or `reset --hard`. Never `git stash` — not
even tagged, not even in your own worktree. The stash list is
per-**repository**, shared across every worktree of it: a `pop` or `drop`
in yours can take another agent's, or Peter's, stash (this happened
2026-09-18 with his unrelated July stash). To test against clean main, use
`git worktree add --detach <tmp> origin/main`, never a stash. Push
immediately after committing (another agent's push otherwise carries your
local commits to origin on their schedule). Integrate via `gh pr create`.
Bench PRs get the `bench` label.

## 7. Contradict the brief

This brief is a hypothesis written partly from memory. When the code
disagrees, the code wins — say so in your report, explicitly, even if
nobody asked. (Three agents each found the manager's brief wrong on
2026-09-21; every correction was right.)

## 8. Report format

Milestone every 5 minutes with a revised estimate. Final report: what was
extracted into SUI, what was rejected or kept local, the assumptions the
consumer must confirm, and every contradiction of this brief you found.

---

## For consumer-repo prototyping

Peter, 2026-09-22: *"I don't want to build in thorcasting and move to SUI.
I'd like to build in SUI as a parallel linked codebase. That way Thorcasting
never sees anything but pure SUI."* The direction is **SUI-first** — the
consumer is never where a shape is drafted, only where the finished
composition is proven live. The link exists to remove publish latency, not
to relocate authoring:

1. **Link the consumer to the local SUI checkout**: `npm run link:consumer
   -- <path>` (see `docs/link-consumer.md`) so the consumer renders SUI's
   **source** live, with HMR on SUI edits and no build/publish round-trip.
   That's what the link is for — nothing else.
2. **Every shape is authored in SUI.** A `/workshop` bench composes the
   screen; `new:component`/`new:variant` (after the section-1 push-back
   gate) covers any piece composition genuinely can't express. The consumer
   screen then imports **only curried SUI exports** — it is the live proof
   that the pure composition works, never the place a piece gets drafted.
3. **Nothing is ever written in the consumer that would later be
   "extracted."** If you're about to write JSX in the consumer that isn't a
   curried SUI export wired to data props, stop — that's a SUI bench task,
   not consumer code.
4. **Unlink and bump** the consumer's pin once the SUI release lands, so
   its CI exercises the same dist a registry consumer gets.
