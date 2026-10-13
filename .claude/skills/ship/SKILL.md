---
name: ship
description: Release solid-ui-components. Use when asked to ship, release, publish, tag, or cut a version of solid-ui-components/SUI. A minor release is automatic after a merge to main; run the release script only for a patch or a major.
---

# Ship solid-ui-components

A release is a merge to `main`. `.github/workflows/release.yml` cuts the
version after the merge's CI goes green, and `publish.yml` publishes to
GitHub Packages after the release commit's CI goes green. The mechanics are
in `.claude/skills/promote/SKILL.md` § *Release & publish*.

## Procedure: a minor release, the normal case

1. **Leave the entry.** The PR carries its lines under `## Unreleased` in
   `CHANGELOG.md`, in the file's style: bold name, em dash, what changed.
   Done when `npm run release:dry` on the branch says it will release and
   names the version.
2. **Merge the PR.** `gh pr merge <n> --merge --delete-branch`. Done when
   `gh run list --limit 3` shows CI running on the merge commit.
3. **Watch the chain.** CI on the merge → Auto-release → CI on the release
   commit → Publish to GitHub Packages. Done when
   `git ls-remote --tags origin vX.Y.0` returns the tag and the Publish run
   is green.

Auto-release cuts a version when both hold: `## Unreleased` has content, and
the merge touched `src/**` or a dependency block in `package.json`. A
docs-only merge with Unreleased content waits for the next shippable merge.

Keep your own release commit and tag off `main` while this chain can fire.
A manual push races the workflow for the same version: on 2026-10-13 both
built v0.218.0, the manual push landed first, and the workflow's push was
rejected. `enforce_admins` is false, so an admin push gets through the branch
protection that stops the workflow.

## Fallback: a patch, a major, or the workflow disabled

Auto-release only cuts a minor. For anything else, write the changelog
section and run the script. The script refuses a dirty tree, so the
changelog commit comes first.

1. **Write the section.** Move the `## Unreleased` entries into a new
   `## X.Y.Z — YYYY-MM-DD` section, re-add the empty `## Unreleased` heading,
   and commit: `git add CHANGELOG.md && git commit -m 'docs(changelog): write
   the X.Y.Z section'`.
2. **Run the script.** It bumps `package.json` and the lockfile, regenerates
   nothing else, commits, pushes `main`, tags and pushes the tag. Set
   `RELEASE_TRAILERS` to your own trailers; the push follows the commit at
   once, so there is no later amend:

```bash
RELEASE_TRAILERS='Co-Authored-By: <model> <noreply@anthropic.com>
Claude-Session: <session url>' \
  .claude/skills/ship/scripts/release.sh patch   # or major | X.Y.Z
```

   The pre-push hook blocks a push whose `catalog.json` is stale, and the
   catalog records the version: run `npm run catalog`, amend the release
   commit with it, then push and tag by hand (`git push && git tag vX.Y.Z &&
   git push origin vX.Y.Z`).
3. **Verify.** `gh run watch` the Publish run, or check
   https://github.com/orgs/primestageprime/packages?repo_name=solid-ui-components

## Consumers

- **jtf-ui** links `../solid-ui-components` and its CI image builds SUI from
  the sibling checkout at `main`, so it gets changes on its next image build
  without a tag.
- **amygdala-ui** and other registry consumers pin
  `@primestageprime/solid-ui-components@X.Y.Z`; the publish workflow
  dispatches `sui-published` to them.
- A long-running Vite dev server in a consumer serves a stale `dist` until it
  restarts with a cache clear.

## Gotchas

- This repo uses **npm** (`package-lock.json`, npm publish workflow), not pnpm.
