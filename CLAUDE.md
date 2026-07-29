# CLAUDE.md

Repo-specific guidance for Claude Code. Project-wide docs live in `CONTEXT.md`,
`AGENT_GUIDE.md`, `STYLE_GUIDE.md`, and `DESIGN_LANGUAGE.md`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `primestageprime/solid-ui-components`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Handoffs

`docs/handoffs/` holds plans a fresh agent can pick up — in-flight work with its
measurements, blockers and out-of-scope traps already established, so nothing
gets re-derived. Sometimes that work spans SUI and a consumer repo; sometimes it
is a map of the open issues here.

**Read `docs/handoffs/open-work.md` before starting substantial work in this
repo** — it lists what is open, what is deliberately *not* to be "fixed", and the
ratchet/CI rules that will otherwise fail your PR.

A handoff is deleted once its tasks land, and anything worth keeping long-term
moves to `docs/adr/` first.

## Memory

Use `mempalace_search` whenever the user references past decisions, prior work, or context outside the current codebase. Filter by `--wing` when scope is clear.
