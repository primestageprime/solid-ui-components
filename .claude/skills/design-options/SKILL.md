---
name: design-options
description: Use when designing a page, flow, or component on a workshop bench and a structural decision comes up (which layout, which list, which panel/container, which chart) — for "/design-options", "offer me options", "what existing component should we use here". Presents 2-4 EXISTING SUI candidates as an interactive choice with previews; never invents new components at this stage.
---

# Design options (choose from what exists)

When workshopping a design, structural decisions — which layout, which list,
which container, which chart — should be made by Peter from a menu of
**existing** SUI components, not defaulted silently by the agent. This skill
turns each such decision into an explicit choice.

## When to invoke

- At the start of a bench design: the PAGE LAYOUT decision, always.
- Whenever the next design step could be satisfied by more than one existing
  component family (list vs table, panel vs surface, modal vs bottom sheet…).
- When Peter says "offer me options" / "what should we use here".

Do NOT use this to propose new components — that's what the bench iteration
itself is for, and new-component proposals go through the normal
start-minimal-confirm-with-Peter rule.

## Steps

1. **Inventory the candidates.** Ground truth is the code, not memory:
   `COMPONENTS.md` for the catalog, `src/components/` for the real props, and
   the gallery (port 6006) to see them. Restrict to components that genuinely
   fit the decision; 2–4 candidates, each a distinct approach — not four
   flavors of the same thing. Include the current choice as an option when
   one is already on the bench.
2. **Present with AskUserQuestion.** One question per decision. Each option:
   - label = the component/composition name (mark the current or recommended
     one "(Recommended)" first when there is a clear favorite),
   - description = one or two sentences: what it gives, its key props, and
     the trade-off,
   - preview = a compact ASCII mockup of THIS page rendered with that option
     (previews are what make the choice real — always include them for
     layout/structure decisions).
3. **Apply the choice as a SKELETON — incremental refinement.** A structural
   decision lands as bare bones first: render the chosen structure with
   placeholder text in each region ("Queue — cards here", "Card detail",
   "Counts") and NOTHING else, so Peter sees the skeleton before any region
   is filled. Note the decision in the bench header comment
   (`// LAYOUT: ThreePanelLayout — chosen via /design-options`).
4. **Refine one region per decision.** Each subsequent /design-options round
   picks ONE placeholder region, offers the candidates for it, and replaces
   just that placeholder with the chosen component. Never fill multiple
   regions in one step — the bench should visibly evolve skeleton → region
   by region → complete.
5. **Log follow-on decisions** the choice surfaces (e.g. picking AppShell
   raises "what goes in the nav?") and offer them as the next question when
   they become load-bearing — don't batch every future decision at once.

## Decision categories (extend as needed)

| Decision | Typical candidates |
|---|---|
| Page layout | ThreePanelLayout, AppShell, Page + Stack sections, ResizableContainer split |
| Item collection | ActionList, BaseTable/FilterableTable, GroupedTable, List, CensusView |
| Detail container | InfoPanel/Panel variants, Surface/CardSurface, Modal, BottomSheet |
| Counts/metrics | CountChip stack, StatusBadge, NumberWithUnits, RingChart, GapCell |
| Flow/progress | DagChart, ProgressCheck, StackedProgressBar, ProgressCard |

## Rules

- Options must be REAL: verify each candidate's exported name and key props
  against the source before offering it.
- Consistency > variety (the standing commandment): when an app already uses
  a component for the same role elsewhere, that's the recommended option.
- One decision per question; at most two questions per AskUserQuestion call.
- The choice is Peter's — never pre-apply a non-current option before asking.
