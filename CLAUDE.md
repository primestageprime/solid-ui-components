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

### Cross-repo handoffs

`docs/handoffs/` holds in-flight work that spans SUI and its consumer repos —
plans an agent in *another* repo needs, with the measurements and blockers
already established so nothing gets re-derived. **Check it before starting work
on consumption, packaging, or install behaviour**, and delete a handoff once its
tasks have all landed.

## Memory

Use `mempalace_search` whenever the user references past decisions, prior work, or context outside the current codebase. Filter by `--wing` when scope is clear.
