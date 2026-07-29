# Handoff: retiring SUI's install-time rebuild

**Status as of 2026-07-29.** Cross-repo work. Each task below names the repo it
belongs to; hand this document to an agent working in that repo. Tasks 1 and 2
are independent of each other. Task 3 is blocked until Task 1 and PR
[amygdala-ui#211](https://github.com/primestageprime/amygdala-ui/pull/211) both
land.

---

## Needs a human, not an agent

Two things gate this work and no agent can resolve either:

1. **`NPM_TOKEN` in thorcasting-ui's Cloudflare Pages build environment.** That
   configuration lives outside every repo, so it cannot be read or set from a
   checkout. **All of Task 1 waits on it, and doing Task 1 without it breaks the
   production deploy.**
2. **A review of [amygdala-ui#211](https://github.com/primestageprime/amygdala-ui/pull/211).**
   One-line pin change plus lockfile. See "Already done" below for exactly what
   was verified on it, so the review doesn't have to re-derive that. **There is
   no agent task in `amygdala-ui`** — the work there is finished and merging is
   a human call.

## What is actually actionable right now

Only **Task 2**. Task 1 is held by blocker 1 above, Task 3 is held by Task 1,
and amygdala-ui needs a reviewer rather than an agent. An agent handed Task 1
today will correctly stop at its prerequisite and do nothing.

---

## Background: what the problem actually is

`solid-ui-components/package.json` contains:

```json
"prepare": "git config core.hooksPath githooks 2>/dev/null; npm run build"
```

npm fires `prepare` on **every root `npm ci`/`npm install`**, and on **every
install of a git dependency**. SUI's `prepare` runs a full client + server Vite
build — ~17s locally, ~33s on a CI runner, 10.7s of it `vite-plugin-dts` alone.

This is *not* a mistake that can simply be deleted. `prepare` is the **only**
lifecycle hook npm runs when a consumer pins SUI as a git dependency
(`github:primestageprime/solid-ui-components#vX.Y.Z`), and a git checkout has
no `dist/`. Remove the build and those consumers get an empty package.

### Verified npm lifecycle hook matrix

Measured with a probe package, not read from documentation — npm's own docs
state that `prepack` runs "when installing a git dependency", and **that is not
what happens**:

| Action | `prepare` | `prepack` |
|---|---|---|
| root `npm install` / `npm ci` | ✅ | ❌ |
| `npm link` (inside SUI) | ✅ | ❌ |
| git-dependency install (consumer) | ✅ | ❌ |
| `npm pack` / `npm publish` | ✅ | ✅ |

**`prepack` is therefore the correct hook for "produce `dist` for the tarball"**
— it fires for publishing and not for git-dep installs. But it only becomes safe
to switch once no consumer resolves SUI via git.

Because that table contradicts npm's published documentation, here is the probe
that produced it — rebuild it rather than trusting either source:

```jsonc
// package.json of a throwaway package, committed to a local git repo
{
  "name": "hook-probe",
  "version": "1.0.0",
  "main": "index.js",
  "files": ["index.js", "ran-*.txt"],
  "scripts": {
    "prepare": "node -e \"require('fs').writeFileSync('ran-prepare.txt','yes')\"",
    "prepack": "node -e \"require('fs').writeFileSync('ran-prepack.txt','yes')\""
  }
}
```

Listing `ran-*.txt` in `files` is the trick: any hook that fires before packing
leaves a marker *inside the installed package*. Then, from a separate consumer
directory, `npm install "git+file:///path/to/hook-probe"` and list
`node_modules/hook-probe/`. Only `ran-prepare.txt` appears. The control — plain
`npm pack` in the probe itself — produces both markers, which is what proves the
probe can detect `prepack` at all.

### The cost, measured

Installing the same SUI version both ways (v0.126.0):

| | Time | Resulting tree |
|---|---|---|
| `github:primestageprime/solid-ui-components#v0.126.0` | **46s** | 2391 files, 15 MB |
| `@primestageprime/solid-ui-components@0.126.0` (GitHub Packages) | **2.5s** | 2391 files, 15 MB |

Byte-identical outcome, 18× the time.

---

## Already done (do not redo)

**`solid-ui-components` — merged as `aa76856`.** Both workflows now install with
`--ignore-scripts`, so `prepare` no longer fires in CI; the one job that needs
`dist` builds it explicitly.

| Job | Before | After |
|---|---|---|
| lint | 55s | 19s |
| health | 87s | 18s |
| build | 88s | 47s |
| typecheck | 75s | 65s |
| test | 159s | 116s |
| **CI total runner time** | **464s** | **265s** |
| **Publish job** | **118s** | **47s** |

`publish.yml` previously built SUI **three** times (`npm ci` → `prepare`, the
Build step, and `npm publish` firing `prepare` again while packing). It now
builds once and asserts `dist/{index.js,server.js,index.d.ts,index.css}` are
non-empty before packing, because with `--ignore-scripts` on `npm publish` the
Build step is the only thing populating `dist` — deleting it would otherwise
publish an empty package silently.

**`amygdala-ui` — PR #211 open, awaiting merge.** `github:…#v0.98.0` →
`npm:@primestageprime/solid-ui-components@0.98.0`. Same version; mechanism
change only. All infrastructure was already present and merely unused for this
dependency: `.npmrc` scoping `@primestageprime` to GitHub Packages, `NPM_TOKEN`
in `ci.yml`, and a BuildKit secret mount in the `Dockerfile`.

Verified before opening the PR, so a review need not repeat it:

- `pnpm install --frozen-lockfile --prod=false` — the exact command the
  Dockerfile runs — succeeds in **2s**. This matters because `--frozen-lockfile`
  hard-fails on any lockfile/manifest mismatch, so it is also the check that the
  regenerated `pnpm-lock.yaml` is correct.
- Resolves `@primestageprime/solid-ui-components@0.98.0`; `dist/index.js` and
  `dist/index.css` present.
- `pnpm build` completes — vinxi client, server-fns, and Nitro server all built,
  `.output/server/index.mjs` emitted.
- Lockfile diff is 10 insertions / 6 deletions; only the SUI entry moved. It now
  carries an `integrity` sha512, which the git-tarball entry did not have.

**Not verified:** nothing exercised the running app, only the build. And 0.98.0
is 28 minor versions behind current — deliberately left alone, since bundling an
upgrade into a mechanism change would make any regression impossible to
attribute.

## Consumer inventory

| Repo | Pin today | Package manager | Action |
|---|---|---|---|
| `thorcasting-ui` | `github:…#v0.120.0` | npm | **Task 1** |
| `amygdala-ui` | `github:…#v0.98.0` | pnpm | PR #211 — merge it |
| `dside-ui` | `npm:@primestageprime/solid-ui-components@^0.104.0` | npm | none — already correct, use as the model |
| `jtf-ui` | `link:../solid-ui-components` | npm | none — local link, `prepare` not involved |

---

## Task 1 — `thorcasting-ui`: resolve SUI from GitHub Packages

**Repo: `thorcasting-ui`.**

### Blocking prerequisite — confirm before touching any file

`NPM_TOKEN` (a PAT with `read:packages`) must exist in the **Cloudflare Pages
build environment**. thorcasting-ui's deploy configuration is not in the repo,
so this cannot be verified from a checkout. **If the token is not set, this
change breaks the production deploy.** Confirm with the repo owner first.

`thorcasting-ui` today has no `.npmrc`, no GitHub Actions workflows, and no
reference to `NPM_TOKEN` anywhere in the repo.

### Steps

**Before anything: `thorcasting-ui` had six modified files uncommitted on `main`
as of 2026-07-29.** Check `git status` and do not sweep that work into a commit.
Branch from a clean state or ask the owner what to do with it first.

`docs/sui-github-packages.md` already exists in that repo and describes this
migration. It was written when SUI was at 0.43.0 and predates the Cloudflare
question, so treat its "no urgency" framing as superseded by this document.
Its mechanics are broadly right with **one stale step**: it says to run
`npm install solid-js d3-scale katex` to declare peer deps. SUI's
`peerDependencies` are only `d3-scale` and `solid-js`, both of which
thorcasting-ui already declares — and `katex` is a regular *dependency* of SUI,
so installing it in the consumer is unnecessary. Skip that step.

1. Add a committed `.npmrc` (copy `dside-ui`'s, which is the working model):
   ```ini
   @primestageprime:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
   ```
2. In `package.json`:
   ```diff
   - "@primestageprime/solid-ui-components": "github:primestageprime/solid-ui-components#v0.120.0"
   + "@primestageprime/solid-ui-components": "0.120.0"
   ```
   **Keep the version identical.** This is a mechanism change, not an upgrade.
   Bumping SUI is a separate decision with its own risk — and see Task 2, which
   must land first if any upgrade past v0.125.2 is contemplated.
   Version `0.120.0` is confirmed present on the registry.
3. `rm -rf node_modules && npm install` to regenerate `package-lock.json`
   against the registry resolution.
4. Note the **local-dev consequence**: a committed project `.npmrc` overrides
   `~/.npmrc`, so every developer must export `NPM_TOKEN` in this repo even if
   their home `.npmrc` holds a raw token.

### Verification

- `npm ci` succeeds from a clean `node_modules`
- `node -p "require('@primestageprime/solid-ui-components/package.json').version"`
  prints `0.120.0`
- `npm run build` completes
- The lockfile entry gains an `integrity` hash it did not have as a git
  dependency (a git tag can be moved; a published version cannot)

---

## Task 2 — `thorcasting-ui`: fix the `SUI_SOURCE_LINKED` detection

**Repo: `thorcasting-ui`.** Independent of Task 1 — this is a correctness bug
that exists regardless of how SUI is resolved, and it is armed right now.

`app.config.ts` decides whether to build SUI from source with:

```ts
// SUI ships only `dist/` when installed from the GitHub pin; `src/` exists
// only when the package is npm-linked to the local repo.
const SUI_SOURCE_LINKED = existsSync(
  "node_modules/@primestageprime/solid-ui-components/src",
);
```

**That comment stopped being true in SUI v0.126.0.** SUI's `files` field became
`["dist", "src"]` in commit `ef99119` (2026-07-28). Verified: `src/` is present
with 1013 files in **both** the git-dependency and the registry install of
v0.126.0. v0.126.0 is the first tag containing the change; v0.120.0 (the current
pin) still ships `files: ["dist"]`, which is why nothing is broken today.

**Consequence:** the next SUI upgrade past v0.125.2 — by either resolution
mechanism — flips `SUI_SOURCE_LINKED` to `true` and puts the **production**
build on a resolve path that has only ever been exercised in local dev. It will
resolve SUI to `src/index.ts` and compile SUI's source rather than consuming the
prebuilt `dist`.

This consequence is read from the code, **not measured** — nobody has yet built
thorcasting-ui against v0.126.0. Doing so is a reasonable first step.

### Fix

Test for a **symlink**, which is what `npm link` actually produces, rather than
for a path that a published tarball now also satisfies:

```ts
import { lstatSync } from "node:fs";

const SUI_SOURCE_LINKED = (() => {
  try {
    return lstatSync(
      "node_modules/@primestageprime/solid-ui-components",
    ).isSymbolicLink();
  } catch {
    return false;
  }
})();
```

Update the stale comment above it in the same change: `src/` now ships in the
published package, so its presence says nothing about how SUI was installed.

**Rejected alternative:** dropping `src` from SUI's `files`. The `exports` map
carries `"source": "./src/index.ts"` entries, so shipping `src` is deliberate —
it is what lets a consumer opt into source mode at all. Removing it would fix
this detection by deleting the feature it misdetects.

### Verification

- With SUI installed normally, `SUI_SOURCE_LINKED` evaluates `false` — log it
  during `npm run build` and confirm
- With SUI `npm link`ed, it evaluates `true` and dev still gets source mode
  (real component names in DevTools, HMR on SUI edits with no SUI rebuild)
- Bump SUI to the current release in a throwaway branch and confirm a
  production build still consumes `dist/`

---

## Task 3 — `solid-ui-components`: move the build from `prepare` to `prepack`

**Repo: `solid-ui-components`. BLOCKED** until Task 1 has landed **and**
amygdala-ui PR #211 is merged. Verify both before starting: if any consumer
still resolves SUI via `github:`, this change ships them an empty package.

### Change

```diff
- "prepare": "git config core.hooksPath githooks 2>/dev/null; npm run build",
+ "prepare": "git config core.hooksPath githooks 2>/dev/null",
+ "prepack": "npm run build",
```

Per the verified hook matrix above, this keeps the build for `npm pack` /
`npm publish` and drops it for root installs and git-dep installs.

### Consequence that must be handled in the same change

**`npm link` fires `prepare`, not `prepack`** — so after this change, `npm link`
in SUI no longer produces a `dist/`. This regresses the documented local-linking
workflow, which currently reads "`npm link` … runs prepare→build once".

Update both places that describe it:

- `docs/local-development.md` in this repo
- the **SUI Local Linking** section of the user's global `~/.claude/CLAUDE.md`
  (flag this to the user — an agent should not edit it silently)

The new instruction is `npm run build && npm link`. Note that thorcasting-ui is
unaffected in the linked case *if* Task 2 has landed, because it switches to
source mode and never reads `dist/` — but other consumers linking SUI do read
it.

Once this lands, the `--ignore-scripts` flags added in `aa76856` become belt-and
-braces rather than load-bearing. **Leave them in place**: they keep CI honest
if `prepare` ever regains a build, and `publish.yml`'s guard step depends on the
publish-time one.

### Verification

- `npm pack --dry-run` still reports ~2391 files with a populated `dist/`
- `npm ci` in a clean clone produces **no** `dist/`, and `npm test`,
  `npm run lint:ci`, `npx tsc --noEmit`, `npm run typecheck:dev` and
  `npm run health` all still pass (this is already known to work — it is what
  `aa76856` was verified against)
- `npm run build && npm link` produces a `dist/`, and a linked consumer resolves
  it
- A release dry-run reaches `publish.yml`'s "Verify build output before packing"
  step and it passes

---

## Which repo's agent gets what

| Task | Repo | Blocked by |
|---|---|---|
| 1 — resolve SUI from the registry | **`thorcasting-ui`** | `NPM_TOKEN` in the Cloudflare Pages build env (human decision) |
| 2 — fix `SUI_SOURCE_LINKED` | **`thorcasting-ui`** | nothing — can start now |
| 3 — `prepare` → `prepack` | **`solid-ui-components`** | Task 1 + amygdala-ui#211 |
| merge PR #211 | **`amygdala-ui`** | review only |

Tasks 1 and 2 are both in `thorcasting-ui` and can go to the same agent, but
**Task 2 should land first** — it is a live bug, it needs no external
prerequisite, and Task 1 is what makes future SUI upgrades routine enough that
Task 2's landmine would actually get stepped on.
