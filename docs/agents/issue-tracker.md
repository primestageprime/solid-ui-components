# Issue tracker: dside

Issues, tasks and PRDs for this repo live in **dside**, the user's task tracker,
under project tag **`sui`** in the **`primestage`** space.

GitHub Issues was the tracker until 2026-07-31 and is now **retired** — see
`CHANGELOG.md`. Do not file new issues with `gh issue create`. The closed issues
remain readable for history.

## Resolving the project — never guess

The repo root carries `.dside-config`:

```json
{
  "slug": "sui",
  "space": "primestage"
}
```

Read it with a JSON-aware tool, not `grep`/`cut`. The slug is an arbitrary tag
chosen when the project was first tracked and does **not** match the repo
directory name — this directory is `solid-ui-components`, but the tag is `sui`.
Guessing the tag from the directory name silently reads empty and writes
somewhere nobody looks.

## Environment — never omit these

The CLI defaults to a *local* database and will report success against the wrong
one:

```bash
export STDB_URI=wss://maincloud.spacetimedb.com STDB_DB=dside DSIDE_CRED_STORE=dside-tracker
```

The numeric space id for `primestage` is **3**. Prefer resolving it from the
space name via `dside workspace list --json` over hardcoding it.

## Conventions

All read commands take `--json`. Parse it; do not scrape the human output.
Errors are not JSON — check exit status, not only stdout.

- **List open tasks**:
  `dside list --space-id 3 --project sui --status false --json`
  (`--status true` for done, omit for everything)
- **Show one task**: `dside get <id> --json` — adds parents, tags, posts, receipts.
- **Create a task**:
  `dside create --space-id 3 --project sui --tag core --title "<terse title>" --json -- "<fuller description>"`
  Returns `{"id":<n>}`.
- **Comment**: `dside post <id> --intent progress -- "<message>"`
  Intents: `discussion` (default), `progress`, `question`, `answer`,
  `done-claim`, `fault`, `observation`.
- **Complete**: `dside complete <id>` — equivalent to `truth <id> true`, plus a
  cascade closing any open Work.

**`--tag core` is mandatory. Never pass `--tag agentic`** — that routes the task
to the agent-owned workflow stage, so a dispatcher watching the space claims it
and *starts doing the work*. Dispatching is `dside delegate`, a different tool
with different consequences.

## Status model — there is no in-progress

A task is **open** (`truth` = `False` or `Unknown`) or **done** (`truth` =
`True`). There is no in-progress state, no priority, and no due date. Do not
invent them or encode them in titles — this is why the old GitHub triage labels
were retired rather than ported. Assignees are read from `get --json` and set in
the dside UI.

## When a skill says "publish to the issue tracker"

Create a dside task with `dside create` as above.

## When a skill says "fetch the relevant ticket"

Run `dside get <id> --json`.

## Pull requests still live on GitHub

Retiring the *issue* tracker does not change code review. PRs are still
`gh pr create` against `primestageprime/solid-ui-components`, and
`AGENT_GUIDE.md` § "`main` is contended" still governs branching and tagging.
Reference the dside task id in the PR body.
