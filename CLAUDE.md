# CLAUDE.md

Repo-specific guidance for Claude Code. Project-wide docs live in `CONTEXT.md`,
`AGENT_GUIDE.md`, `STYLE_GUIDE.md`, and `DESIGN_LANGUAGE.md`.

## Agent skills

### UI subagent brief

`.claude/skills/sui-agent-brief/SKILL.md` — splice into the top of any UI
subagent's prompt (SUI or a consumer repo) before the task-specific brief;
covers the composition axiom, the push-back gate, the build loop, and the
trap list.

### Composing a prototype from a requirement

`.claude/agents/sui-composer.md` — spawn this agent to turn a requirement (a
sketch description, a screen brief, a user story) into a static prototype on
a workshop bench, one region at a time, stopping for Peter's reaction after
each. Never for promoting a settled bench (`/sui-build`, `/promote`) or for
consumer-repo work.

### Issue tracker

Tasks are tracked ad hoc in-session for now — there is no external tracker
directive. Pull requests live on GitHub.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Handoffs

`docs/handoffs/` holds plans a fresh agent can pick up — in-flight work with its
measurements and blockers already established, so nothing gets re-derived.
Sometimes that work spans SUI and a consumer repo.

A handoff is deleted once its tasks land, and anything worth keeping long-term
moves to `docs/adr/` first.

**Before starting substantial work in this repo, read:**

- `AGENT_GUIDE.md` § *The health ratchet will fail you* — the ratchet, CI and
  showcase/test/depth-header rules that will otherwise fail your PR.
- `docs/adr/0008-deliberately-unfixed.md` — what is deliberately *not* to be
  "fixed", and why. Check it before driving any metric to zero.
- `AGENT_GUIDE.md` § *Unstable exports* / `COMPONENTS.md` § *Unstable exports*
  — before adding to or promoting from `/unstable`, or exporting something
  from the root that belongs there instead.
