# `prepare` keeps the build; CI installs with `--ignore-scripts`

`package.json` contains what looks like an obvious inefficiency:

```json
"prepare": "git config core.hooksPath githooks 2>/dev/null; npm run build"
```

npm fires `prepare` on every root `npm install`, so this is a full client +
server Vite build — ~17s locally, ~33s on a CI runner — attached to installing
dependencies. Every workflow in `.github/` therefore installs with
`--ignore-scripts`, which looks like a workaround for a problem that should be
fixed at the source.

**Both are deliberate. The "obvious fix" — moving the build to `prepack` — was
evaluated and rejected.** This ADR exists because that fix is genuinely
appealing, npm's own documentation appears to endorse it, and adopting it breaks
two things that produce no failure in this repo.

## The verified lifecycle hook matrix

Measured with a probe package whose `prepare` and `prepack` each write a marker
file listed in `files`, so any hook that fires leaves evidence *inside the
installed package*:

| Action | `prepare` | `prepack` |
|---|---|---|
| root `npm install` / `npm ci` | ✅ | ❌ |
| `npm link` (inside SUI) | ✅ | ❌ |
| git-dependency install (consumer) | ✅ | ❌ |
| `npm pack` / `npm publish` | ✅ | ✅ |

**npm's documentation states that `prepack` runs "when installing a git
dependency". It does not.** That row is the whole reason `prepare` cannot be
replaced by `prepack` casually — do not re-derive this from the docs, they are
wrong on the point that matters.

## Why `prepare` keeps the build

Two consumers of the "obvious fix" break silently:

- **`npm link` fires `prepare`, not `prepack`.** Moving the build means
  `npm link` no longer produces a `dist/`, breaking the documented SUI local
  iteration loop (see `docs/local-development.md`). Nothing errors — the
  consumer just resolves an empty package.
- **A git-dependency pin at a *new* tag would install an empty package.**
  Consumers pinning `github:primestageprime/solid-ui-components#vX.Y.Z` get no
  `dist/` from the checkout and rely on `prepare` to produce it.

  Note the non-obvious part: a consumer pinned to an *old* tag is unaffected by
  any change made here, because npm checks out that tag and runs **its**
  `package.json`. Verified — a probe consumer pinned to `v1.0.0` still received
  a built `dist` after `main` moved the build to `prepack`. So this is a
  forward-looking hazard for future pins, not a break of existing ones.

## Why the fix is `--ignore-scripts` at the call site

The cost `prepare` imposed was almost entirely in CI, where it ran in front of
five jobs and only one needed `dist`:

| Job | Before | After |
|---|---|---|
| lint | 55s | 19s |
| health | 87s | 18s |
| build | 88s | 47s |
| typecheck | 75s | 65s |
| test | 159s | 116s |
| **CI total runner time** | **464s** | **265s** |
| **Publish job** | **118s** | **47s** |

`publish.yml` had been building SUI **three** times per release — `npm ci` firing
`prepare`, the explicit Build step, and `npm publish` firing `prepare` again
while packing.

Verified in a clean clone with `--ignore-scripts` and **no `dist/` present**:
2686 tests, `lint:ci`, `tsc --noEmit`, `typecheck:dev` and `health` all pass.
`esbuild` declares a postinstall (`hasInstallScript` in `package-lock.json`) but
resolves its binary from the per-platform optional dependency at runtime, so
skipping it is inert.

## What remained, and why it wasn't worth taking

After `--ignore-scripts` landed and the consumers moved to the registry
(`docs/handoffs/`), the only remaining waste was **a local `npm install` in this
repo paying 17s**. Trading `npm link` and a silent-empty-package failure mode for
17 seconds is a bad deal, so `prepare` stays as it is.

## Enforcement

`scripts/build-config.test.ts` asserts that `prepare` still builds and that both
workflows still install with `--ignore-scripts`. As with ADRs 0005 and 0006,
removing either produces no test failure, no type error, and no visible symptom
here — the damage lands in CI minutes or in a downstream install, months after
whoever deleted the "redundant" flag has moved on.
