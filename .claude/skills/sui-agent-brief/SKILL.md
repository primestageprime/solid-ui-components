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
**bench** (`/workshop <name>`) — it appears in the local gallery (`npm run
dev`, port 6006) immediately, no PR or merge required to show Peter. Get his
reaction to pixels, not to a description, before iterating further; spec
churn against text is where the hours go (the License board took ~5 hours
and four PRs off a 40-minute brief). PR the bench once it's worth keeping
around, for durability and so other agents can see it.

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

## 6. Git rules for a shared checkout

Branch before your first commit. Stage only your own paths — never
`git add -A`. Never `--amend`, `stash`, or `reset --hard`. Push immediately
after committing (another agent's push otherwise carries your local commits
to origin on their schedule). Integrate via `gh pr create`. Bench PRs get
the `bench` label.

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

The loop for building a real screen in a consumer app (jtf-ui,
thorcasting-ui, amygdala-ui, dside-ui, taskmaster):

1. **Link SUI locally**: `npm run link:consumer` so the consumer resolves
   SUI from source, not the published package. Not in `package.json` as of
   2026-09-22 — until it lands, use the consumer's own local-source setup
   (`docs/local-development.md`) and say so in your report.
2. **Compose the screen from curried variants only** — same axiom as
   above, just consumed rather than authored. Import only curried exports,
   never a `create*` factory or an unexported base.
3. **Hit the SUI gate only when composition genuinely fails** — i.e. no
   existing curried variant, and no combination of existing ones, expresses
   the shape. That failure is the signal to cross into SUI, not a shortcut
   around section 1's push-back gate.
4. **Extract into SUI via `/sui-build`** once the piece is real and a
   second screen would draw it the same way. Don't build the same shape
   twice in the consumer while waiting for the extraction — extract first,
   then keep composing.
5. **Unlink and bump** the consumer's `package.json` to the version
   `/promote` or `/ship` cut, so its CI exercises the same dist a
   registry consumer gets. Nothing is written twice — a Local Curried
   Variant duplicating a shape another consumer already needed is a step-4
   miss, not a valid end state.
