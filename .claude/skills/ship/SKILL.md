---
name: ship
description: Release solid-ui-components - bump semver, update CHANGELOG, tag, and auto-publish to GitHub Packages. Use when asked to ship, release, publish, tag, or cut a version of solid-ui-components/SUI.
---

# Ship solid-ui-components

A release = version bump + CHANGELOG section + commit + tag. Publishing is
automatic: `publish.yml` triggers on any push to main that touches
`package.json` and publishes to GitHub Packages (npm.pkg.github.com), then
dispatches a notification to amygdala-ui.

## Procedure

1. **Confirm main is green.** `gh run list --limit 3` — the three required
   checks (test, typecheck, build from `ci.yml`) must be passing on HEAD.
   If a recent push bypassed branch protection, wait for CI to settle.
2. **Write the changelog.** Move the `## [Unreleased]` entries in
   `CHANGELOG.md` into a new `## X.Y.Z` section (match existing entry style:
   bold component name, em-dash, behavior summary, code samples where they
   help). Re-add an empty `## [Unreleased]` heading above it. Check
   `git log v<last-tag>..HEAD --oneline` for anything the Unreleased section
   missed — workers sometimes forget changelog entries.
3. **Run the script** (does the mechanical rest — bump, lock sync, commit,
   push, tag; validates step 2 happened):

   ```bash
   .claude/skills/ship/scripts/release.sh patch   # or minor | major | X.Y.Z
   ```

4. **Verify**: `gh run watch` the publish run, or check
   https://github.com/orgs/primestageprime/packages?repo_name=solid-ui-components

## Consumers — who picks this up and how

- **jtf-ui**: uses `link:../solid-ui-components` and its CI Dockerfile builds
  the SUI **sibling checkout at main HEAD** — jtf-ui prod gets SUI changes on
  its next image build regardless of tags. Tags exist for registry consumers
  and history.
- **amygdala-ui** (and other registry consumers): pin
  `@primestageprime/solid-ui-components@X.Y.Z`; the publish workflow's
  repo-dispatch may open the bump automatically (falls back to manual).
- Local dev consumers see changes after `pnpm build`/`npm run build` in SUI —
  long-running vite dev servers serve a STALE dist until restarted with a
  cache clear.

## Gotchas

- This repo uses **npm** (package-lock.json + npm publish workflow) — don't
  pnpm here.
- `src/styles/global.css` is orphaned (not bundled); global CSS belongs in the
  theme files (`src/themes/hud.css`, `bronze*.css`, `_baseline.css`).
- Versioning is manual; there is no release automation beyond publish.yml.
