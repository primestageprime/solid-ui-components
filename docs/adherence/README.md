# SUI adherence — the loop, and the judgement tier that is not built yet

`npm run adherence` asks, per component, **what does it owe the design
philosophy** — and writes the answer as a worklist an agent can take one item
off. `npm run health` already ratchets fourteen repo-wide counters; it says
`inlineStyleSrc 65` and nothing about which of the 65 is a Composite breaking
BEST_PRACTICES §1 versus a Primitive doing its job. This is the other half.

Two tiers. **Tier 1 is built** (this document's first half). **Tier 2 is a
proposal** — Peter decides whether it runs at all.

---

## Tier 1 — mechanical, deterministic, built

```
npm run adherence                       # summary + the top 20 items
npm run adherence -- --list             # every item
npm run adherence -- --component=Fab    # one component
npm run adherence -- --json             # the report on stdout
npm run adherence -- --quiet            # write the files, say nothing
npm run adherence -- --banner           # the SessionStart hook payload
```

| Thing | Where |
|---|---|
| The rules, and the document each comes from | `scripts/adherence.mjs` header |
| Exemptions, each with a quoted reason | `scripts/adherence-exemptions.json` |
| The rules pinned against a file map | `scripts/adherence.test.ts` |
| The worklist (git-ignored) | `docs/adherence/OPEN_ITEMS.md` |
| The machine-readable report (git-ignored) | `docs/adherence/report.json` |
| Refresh after every commit | `githooks/post-commit` |
| Show every agent the open items | `.claude/settings.json` SessionStart hook |
| Take one item as a background refactor | `.claude/skills/refactor-pass/SKILL.md` |

**Item ids are `ADH-<Component>-<rule>`** — one item per (component, rule) with
the occurrences inside it, so the id the refactor skill is handed stays stable
while the component is being worked on. The `<Component>` is a MODULE, not a
folder: `src/components/Badge/` is a namespace holding eight independent
primitives, and scoring it as one component read "Depth 2 owns 8 CSS files",
blaming the deepest member for seven correct Primitives' stylesheets.

### It is not a gate, and `--quiet` always exits 0

Peter decides whether this ever becomes a ratchet (2026-09-17). Until then it
is a report, and both hooks depend on that: a post-commit hook cannot abort a
commit anyway, and a SessionStart hook that fails would break every agent
session in the repo. The cautionary tale is two doors down — the `pre-push`
usage-manifest check blocked four consecutive unrelated pushes, all bypassed
with `--no-verify`, and a gate that trains you to bypass it is worse than no
gate.

`health.mjs` has no "info" mode, so nothing was bolted onto it. Adding one
would mean touching the script that gates merges in order to print something
advisory, which is the wrong trade for a report that has its own command.

### Why these two files are not committed

**Recommended, and implemented: regenerated, git-ignored.** They are listed by
name in `.gitignore` so this README (in the same directory) stays tracked.

The alternative is in front of us: `scripts/health-history.json` IS tracked and
changes on every `npm run health` run, and the cost shows up in
`AGENT_GUIDE.md`, which has to tell every agent *"commit it alongside
health-affecting work rather than leaving it dirty in a shared checkout"*.
Several agents share one working tree and one index here. A tracked file that
a post-commit hook rewrites means:

- every commit produces an unrelated dirty file, in a repo whose own guide says
  *stage only files you touched, never `git add -A`* — so the file is
  permanently dirty or permanently swept into someone else's commit;
- the post-commit hook would have to commit it, which means a second commit
  after every commit, or an `--amend` that the same guide forbids (HEAD may be
  another agent's);
- the diff is noise: a report derived entirely from the tree it describes tells
  a reviewer nothing the tree does not.

The cost of not committing it is that a fresh clone has no worklist until
something regenerates it. That is why the SessionStart hook **regenerates
before printing** rather than reading a file it hopes exists — the scan is
static and fast, and a fresh clone's first session sees a correct list.

### Hook mechanics

Both git hooks live in `githooks/` and are wired by
`git config core.hooksPath githooks`, which npm's `prepare` script runs on
install. Nothing to install by hand; `npm ci` is enough.

- `githooks/pre-push` — the pre-existing health ratchet (gates pushes).
- `githooks/post-commit` — `node scripts/adherence.mjs --quiet`, then
  `exit 0` unconditionally.

The Claude Code hook is a project-level `.claude/settings.json` SessionStart
entry running `node scripts/adherence.mjs --banner`, which prints the
`hookSpecificOutput.additionalContext` envelope with the first 15 lines of
OPEN_ITEMS.md. Building the JSON inside the script rather than in the hook's
shell command is deliberate: no `jq` dependency, no shell quoting, and no
second file to keep in step with the report format. The command ends in
`|| true` and discards stderr, so a broken script degrades to an empty banner
rather than a broken session.

---

## Tier 2 — the LLM judgement pass (PROPOSED, not built)

Tier 1 can only see what a regex can see. It will never say *"`ScrubChart` and
`CashflowScrubChart` have converged and want one component"*, or *"`normStatus`
is a domain name in a library that names shapes, not domains (§6)"*, or
*"these four props are always passed together and want to be one object"*.
Those are judgement, and judgement is what an LLM pass would add: **"areas for
improvement"** alongside the mechanical violations.

### What it would read and write

The mechanical report is the input, not the codebase — that is the whole
economy of the design. A pass gets `docs/adherence/report.json` plus the source
of the components it names, and appends to a separate
`docs/adherence/JUDGEMENT.md` with the same `ADH-`-style ids under a `JDG-`
prefix, so the two tiers never overwrite each other and a stale judgement is
visibly stale.

Each judgement item would carry: the component, the observation, the document
clause it appeals to (or an explicit "no clause — this is taste"), a suggested
direction, and a confidence. **No judgement item is ever actionable without
Peter**, for the same reason `unused-variants` is `info`: §4 gates the public
surface, and most decomposition suggestions move it.

### Cadence, and why not per-commit

| Cadence | Cost per run | Verdict |
|---|---|---|
| Per commit | 1 pass over ~50 composites | **No.** Dozens of runs a day on this repo, and the answer barely changes between commits — a commit touches one component, and the judgement about the other 240 is re-derived and re-billed unchanged. |
| On push / per PR | 1 pass, scoped to changed components | **Maybe, later.** Cheap because it is scoped, and it lands where a reviewer reads it. But it puts a non-deterministic comment on every PR, which is how review comments start getting ignored. Worth doing only once the nightly pass has proved the output is worth reading. |
| **Nightly + on demand** | 1 full pass/day, plus a manual `--judge` | **Proposed.** The full pass runs when nobody is waiting, so latency and cost are both invisible; the on-demand path serves the case that actually matters, which is "I am about to work on this component, what else is wrong with it?" |

Concretely: a scheduled cloud agent (the `schedule` skill / routines) at, say,
03:00, prompted with `report.json` and instructed to write `JUDGEMENT.md` and
open a PR **only if** the file changed materially — so a quiet week produces no
PRs. Plus `npm run adherence -- --judge --component=<X>` for the on-demand
single-component pass, which a session runs itself and never commits.

### What it needs

- **A model credential.** A scheduled cloud agent carries the account's own
  auth, so nothing new is stored. A CI job would need an `ANTHROPIC_API_KEY`
  repository secret — which is the strongest argument for the scheduled agent
  over a GitHub Action: no new secret in the repo, and no key in the logs of a
  job that runs on every push.
- **Nothing else.** No consumer checkouts (the manifest is already committed),
  no network beyond the model, no write access outside `docs/adherence/`.

### The failure mode to design against

A judgement pass that emits 240 suggestions is a file nobody opens, and Tier 1
already shows what that looks like: `unused-variants` alone is 148 items, all
`info`, all correct, and none of them a thing to do. So the proposal caps the
pass at **the ten highest-confidence items** and requires each to name a
document clause or admit it is taste. An eleventh idea is not lost; it is just
not worth a reader's attention this week.

**Peter decides.** Tier 1 stands on its own without it.
