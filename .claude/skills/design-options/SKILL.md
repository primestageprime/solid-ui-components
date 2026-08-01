---
name: design-options
description: Use when designing a page, flow, or component on a workshop bench and a structural decision comes up (which layout, which list, which panel/container, which chart) — for "/design-options", "offer me options", "what existing component should we use here". Drives the decision through docs/agents/design-decision-tree.md (UX/data-centric discriminators + recorded precedents) so as FEW questions as possible are asked; records every choice and its why back into the tree and mempalace.
---

# Design options (a decision tree with memory)

Structural design decisions (which layout, which list, which container, which
chart) are made from **existing** SUI components, chosen by UX/data-centric
reasoning — and every decision feeds institutional memory so the NEXT decision
needs fewer questions. The memory lives in two places:

- `docs/agents/design-decision-tree.md` — the tree of discriminating
  questions per decision category, plus an append-only precedent log.
- mempalace — a knowledge-graph fact per decision, so other sessions/repos
  can recall it (`mempalace_search` before asking; `mempalace_kg_add` after
  deciding).

## Flow

1. **Identify the decision category** (page layout, left list, detail
   container, counts, flow viz, …) and read that section of
   `docs/agents/design-decision-tree.md`.
2. **Answer discriminators from context first.** The design doc, the bench,
   and prior precedents (tree log + `mempalace_search`) usually answer most
   discriminators — e.g. "how many statuses do the items represent?" is
   readable from the data model. Never ask a question the context already
   answers.
3. **Ask only the open discriminators** — batched into ONE AskUserQuestion
   (max 2 questions), phrased as the UX/data question, not the component
   name (ask "should the rail be user-resizable?", not "ResizableContainer
   y/n?"). Include the tree's resulting recommendation and its WHY in the
   question/option descriptions. Use ASCII previews when the options differ
   visually.
4. **If the tree fully decides it**, don't ask a menu — state the choice and
   the reasoning, apply it, and move on (Peter can always override).
5. **Apply as a SKELETON — incremental refinement.** A structural choice
   lands as bare bones first (placeholder text per region); each subsequent
   round fills ONE region. The bench visibly evolves skeleton → region by
   region → complete.
6. **Record the decision** in the same change:
   - Append a precedent line to the tree doc: date · surface · decision ·
     discriminator answers · choice · why.
   - `mempalace_kg_add` an equivalent fact (subject: the surface; relation:
     uses; object: the component; context: the discriminator answers).
   - Note it in the bench header comment
     (`// QUEUE: ActionList — multi-status triage, via /design-options`).
7. **If no branch fits, the tree is missing a discriminator** — extend the
   tree in the same change that records the precedent. The tree only gets
   smarter through use.

## Rules

- Recommendations must be REAL components: verify exported names and key
  props against `src/components/` before proposing.
- Consistency > variety: a same-role precedent (tree log, mempalace, or a
  consumer app) beats a fresh derivation — surface it as the recommendation.
- The reasons are UX/data-centric ("3+ statuses = the list is a workflow
  surface"), never aesthetic ("looks nicer").
- One region per refinement round; never fill multiple regions in one step.
- The choice is Peter's on open discriminators — never pre-apply a
  non-current option before asking. Tree-decided choices may be applied
  directly, stating the rationale.
- Do NOT use this skill to propose new components — new-component proposals
  go through the normal start-minimal-confirm-with-Peter rule.
