# CLAUDE.md

Repo-specific guidance for Claude Code. Project-wide docs live in `CONTEXT.md`,
`AGENT_GUIDE.md`, `STYLE_GUIDE.md`, and `DESIGN_LANGUAGE.md`.

## Agent skills

### Issue tracker

Issues and tasks live in **dside**, under project tag `sui` in the `primestage`
space — resolved from `.dside-config` at the repo root. See
`docs/agents/issue-tracker.md` for the CLI, the required environment, and the
`--tag core` rule.

GitHub Issues was retired as the tracker on 2026-07-31; **pull requests are
unaffected** and still live on GitHub. dside has no labels, no priority and no
in-progress state — don't encode them in titles.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Handoffs

`docs/handoffs/` holds plans a fresh agent can pick up — in-flight work with its
measurements and blockers already established, so nothing gets re-derived.
Sometimes that work spans SUI and a consumer repo.

A handoff is deleted once its tasks land, and anything worth keeping long-term
moves to `docs/adr/` first. Handoffs are **not** a task list — that is dside.

**Before starting substantial work in this repo, read:**

- `AGENT_GUIDE.md` § *The health ratchet will fail you* — the ratchet, CI and
  showcase/test/depth-header rules that will otherwise fail your PR.
- `docs/adr/0008-deliberately-unfixed.md` — what is deliberately *not* to be
  "fixed", and why. Check it before driving any metric to zero.
- The open dside tasks (`dside list --space-id 3 --project sui --status false`).
