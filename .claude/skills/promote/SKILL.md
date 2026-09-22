---
name: promote
description: Use when graduating a component from the dev workshop bench into the published SUI catalog — for requests like "/promote <Component>", "promote the Fab", or "ship/publish this component". Drives the design-system persona through the curried drop-in variant, dedicated showcase, barrel export, catalog registration, and COMPONENTS.md entry, then version-bumps, tags the release commit, and lands it on `main`, where a green CI run triggers the GitHub Packages publish.
---

# Promote a component (workshop → published catalog)

Graduates a component that has been prototyped on a **workshop surface** —
either the master bench (`dev/showcases/workshop.tsx`) or a standalone **Bench**
(`dev/showcases/workshop/<slug>.tsx`, spun up via `/workshop`) — into the
shipped library: exported from the barrel, given a dedicated showcase,
registered in the catalog, documented, and published to GitHub Packages via a
version bump.

Throughout this skill, **the source surface** means whichever of those two the
component currently lives on. Determine it first: if the component sits in
`dev/showcases/workshop/<slug>.tsx`, that **Bench** is the source surface;
otherwise it's the master `dev/showcases/workshop.tsx`.

This is the back half of the team's build loop:

> build on a workshop surface → **iterate until the API is settled** → `/promote` → repeat for the next component.

## Preconditions (stop and fix if any fail)

- The component already lives at `src/components/<Name>/` with its own
  `<Name>.tsx`, CSS (if it owns any), `index.ts`, and a `<Name>.test.tsx`.
- Its API is **settled** — you've eyeballed it in the gallery (`npm run dev`,
  port 6006) and the user is happy. Promotion is not the time to redesign.
- `npx tsc --noEmit` and `npm test` already pass for the component.

If the component is still only inline on the source surface (the master
`workshop.tsx` or its Bench file), first extract it into
`src/components/<Name>/` — promotion graduates a real folder, not a sketch.

## Use the Design System persona

Promotion is design-system work — it lives entirely in `solid-ui-components`
and is about call-site ergonomics, not application UI. Do it **as Veronica**
(`~/.claude/worker-style-guides/design-system.md`): either dispatch a
`code-craftsman` agent seeded with that persona file, or adopt it inline. Her
non-negotiables drive the steps below:

- **Zero-config call sites** — every exported component is fully curried for its
  role; no presentational props leak to the call site (data + event handlers
  only).
- **Minimal variant surface** — add only the variants the real use case needs
  (see `STYLE_GUIDE.md` → "Variant Surface: keep it minimal"). Not the full
  size/color matrix.
- **`COMPONENTS.md` is the source of truth** and **`npm run build` must pass**
  before handoff.

## Checklist

Create a TodoWrite item per step and complete them in order.

1. **Determine depth.** Depth = N+1 of the highest-depth component it renders;
   Atomic/Layout primitives are Depth 1 (`STYLE_GUIDE.md` → "Depth Rules"). A
   component that composes only atomics is **Depth 2**. Fix the component's
   header comment to state its depth. If a Depth-2+ component owns a CSS file
   (the strict rule is "Depth 2 = zero CSS"), that's allowed only for genuinely
   *structural* geometry that no atomic variant can express — note it explicitly
   in the header comment as a deliberate exception.

2. **Curried drop-in variant(s).** Add a `create<Name>` factory mirroring
   `createButton` / `createPanel` exactly — split props into
   `Overrides = Pick<Props, …presentational…>` and
   `DataProps = Omit<Props, keyof Overrides>`, and return
   `Component<DataProps>` via `mergeProps(defaults, props)`. Then add a sibling
   `variants.ts` exporting one concrete curried variant per **real** use case
   (e.g. `export const AddFab = createFab({ icon: "plus" });`). The call site
   must be data + callbacks only: `<AddFab label="Add item" onClick={fn} />`.
   Re-export the factory, variants, and the Overrides/DataProps types from
   `src/components/<Name>/index.ts`.

3. **Barrel export.** Add `export * from "./components/<Name>";` to
   `src/index.ts` (group it near related components).

4. **Dedicated showcase.** Create `dev/showcases/<name>.tsx` exporting
   `<Name>Showcase`, following the `.component-section` / `.example-group` /
   `h2`/`h3`/`.text-meta` idiom (copy the shape from
   `dev/showcases/status-light.tsx` or `button.tsx`). Show the base component,
   each curried variant wired to a **working callback** (prove drop-in), and any
   placement/usage notes. Import from `../../src/components/<Name>`.

5. **Register in the catalog.** In `dev/main.tsx`: import `<Name>Showcase` from
   `./showcases/<name>` and add an `items` entry:
   `{ id: "<name>", label: "<Name>", component: <Name>Showcase, tags: ["depth:N", "<shape>"] }`
   (shape tags: `form`, `layout`, `feedback`, `navigation`, `indicator`,
   `container`, `chart`, `data`, …).

6. **Update `COMPONENTS.md`.** Add the component in the existing format: name,
   depth, public API, curried variants, one usage example.

7. **Clear the source surface.**
   - If the source surface was a **Bench** (`dev/showcases/workshop/<slug>.tsx`):
     delete it with `node scripts/workshop-remove.mjs <slug>` (or `/workshop
     remove <slug>`). It auto-disappears from the gallery — no `dev/main.tsx`
     edit needed. This is the clean case for parallel agents: you only touch
     your own Bench file.
   - If the source surface was the master `dev/showcases/workshop.tsx`: remove
     the component's section so the master is ready for the next component
     (often the next prototype already replaces it — coordinate so two agents
     don't both edit `workshop.tsx`).

8. **Verify gates (all must be green):**
   ```bash
   npx tsc --noEmit      # exit 0
   npm test              # all pass
   npm run build         # build:client + build:server both succeed
   ```

## Release & publish

> **Steps 1–4 are now automatic — do not do them by hand.**
> `.github/workflows/release.yml` runs after every green CI on `main`. If the
> merge touched `src/**` (or a dependency block in `package.json`) **and**
> `CHANGELOG.md` has content under `## Unreleased`, it bumps the minor, rolls
> `Unreleased` into a dated `## X.Y.0 — YYYY-MM-DD` heading, commits
> `chore(release): X.Y.0`, tags **that commit's sha** as `vX.Y.0`, and pushes
> both atomically. So your job in a promotion PR is only to **leave a good
> `## Unreleased` entry** — the version, the heading, the commit and the tag all
> follow from it. Preview the decision locally with `npm run release:dry`
> (writes nothing). It requires the `REPO_ACCESS_TOKEN` secret to be an admin
> PAT; it fails loudly, naming the secret, if that is missing.
>
> Steps 1–4 below are kept as the manual fallback for when the workflow is
> disabled or a **patch/major** bump is wanted — auto-release only ever cuts a
> minor.

Publishing to GitHub Packages is **CI-gated**: `.github/workflows/publish.yml`
triggers on `workflow_run` — it waits for the **CI** workflow (`ci.yml`, which
runs on pushes to `main`) to *complete successfully* on `main`, and never fires
on the push itself (`workflow_dispatch` is the manual escape hatch). There is
no `package.json` path filter — `workflow_run` cannot have one — so it runs
after every green CI on `main` and publishes only when the registry lacks the
version in `package.json`. It checks out the sha CI validated, builds, runs
`npm publish` to `https://npm.pkg.github.com` using the CI `GITHUB_TOKEN` (no
local npm token needed), and then dispatches a `sui-published` event to
consumers (amygdala-ui). So the release = a version-bump commit on `main`
whose CI run goes green.

1. **Bump the version** in `package.json` by semver. A new component or curried
   variant is a **minor** bump (e.g. `0.40.0 → 0.41.0`); a bugfix is a patch.
2. **Update `CHANGELOG.md`** — move items out of `[Unreleased]` into a new
   `## X.Y.Z` section with `### Added` (and `### Changed`/`### Fixed` as needed).
3. **Commit.** Group the promotion as a `feat(<Name>): …` commit if not already
   committed, then a release commit:
   ```bash
   git commit -m "chore(release): X.Y.Z"
   ```
   (Historically this went straight to `main`; recent releases go through a
   short-lived `chore/release-X.Y.Z` PR. Either way, what step 4 needs is the
   sha the release ends up on in `main`.)
4. **Get it onto `main`, then tag that commit BY SHA** (tagging lapsed
   historically — resume it):
   ```bash
   git push origin main          # or push the release branch and merge its PR
   git fetch origin main
   git log --oneline -3 origin/main          # find the release commit
   git tag vX.Y.Z <that-sha>                 # never a bare `git tag vX.Y.Z`
   git push origin vX.Y.Z
   ```
   **Name the sha.** A bare `git tag vX.Y.Z` tags *your branch head*, which is
   not the commit `main` carries once the release went through a PR — and a tag
   on a commit that never landed is worse than none. This is not hypothetical:
   0.175.0 shipped untagged and `v0.175.0` had to be backfilled afterwards onto
   `6d52311`, its `chore: release 0.175.0` commit on `main`. Either the release
   commit or the merge that brought it in is an acceptable target (`v0.175.0` →
   `6d52311`, the release commit; `v0.176.0` → `ec918d6`, the merge); tag
   **after** the merge, so the sha you name is one `main` actually has.
5. **Confirm the publish:**
   ```bash
   gh run list --workflow=publish.yml --limit 1
   npm view @primestageprime/solid-ui-components version --registry=https://npm.pkg.github.com
   ```
   Publish follows CI, so nothing starts until the `main` CI run passes; the
   workflow then no-ops gracefully if the version is already published.
   **A green publish run does not prove consumers were notified** — the "Notify
   consumers" step exits 0 when `REPO_ACCESS_TOKEN` is unset, and the dispatch
   is non-fatal when it fails, so a consumer can silently never hear about a
   release: read that step's log and bump the consumer's `package.json` by hand
   if it skipped.

## Done when

- New version is live on GitHub Packages and tagged `vX.Y.Z` on `main`.
- The component has a barrel export, a dedicated showcase, a `COMPONENTS.md`
  entry, and passing tsc/test/build.
- The source surface is clear: the Bench file is deleted, or the master
  `workshop.tsx` section is removed.
