# Handoff: retiring SUI's install-time rebuild

**Status as of 2026-07-29 — nearly complete.** One item remains, and it needs a
human rather than an agent.

## Remaining

**Review and merge
[amygdala-ui#211](https://github.com/primestageprime/amygdala-ui/pull/211).**
`github:…#v0.98.0` → `npm:@primestageprime/solid-ui-components@0.98.0`. Same
version; mechanism change only, deliberately not an upgrade (0.98.0 is 28 minor
versions behind, and bundling that in would make any regression impossible to
attribute).

Verified before the PR was opened, so a review need not repeat it:

- `pnpm install --frozen-lockfile --prod=false` — the exact command the
  Dockerfile runs — succeeds in **2s**. Since `--frozen-lockfile` hard-fails on
  any lockfile/manifest mismatch, this also confirms the regenerated
  `pnpm-lock.yaml` is correct.
- Resolves `@primestageprime/solid-ui-components@0.98.0`; `dist/index.js` and
  `dist/index.css` present.
- `pnpm build` completes — vinxi client, server-fns, and Nitro server all built.
- Lockfile diff is 10 insertions / 6 deletions; only the SUI entry moved. It now
  carries an `integrity` sha512 the git-tarball entry did not have.

**Not verified:** nothing exercised the running app, only the build.

Delete this document once that PR merges. The durable reasoning has already been
moved to `docs/adr/0007-prepare-keeps-the-build-ci-ignores-scripts.md`.

---

## Done

- **`solid-ui-components` (`aa76856`)** — both workflows install with
  `--ignore-scripts`. CI runner time 464s → 265s; the publish job 118s → 47s,
  having previously built SUI three times per release. Full reasoning and the
  measured npm lifecycle hook matrix are in **ADR 0007**.
- **`thorcasting-ui`** — now resolves SUI as `"0.120.0"` from GitHub Packages
  with a committed `.npmrc`, and its `SUI_SOURCE_LINKED` detection is fixed.
- **Task 3 (`prepare` → `prepack`) — evaluated and rejected.** See ADR 0007.
  Short version: `prepack` does not fire for `npm link` or for git-dependency
  installs, so the change would have silently shipped an empty package to both,
  in exchange for ~17s on a local `npm install`. Guarded by
  `scripts/build-config.test.ts` so it is not re-attempted.

## Correction to this document's earlier claim

An earlier revision stated that Task 3 was blocked until both consumers left git
pins, because otherwise "this change ships them an empty package." **That was
wrong.** npm checks out the pinned ref and runs *that ref's* `package.json`, so a
consumer pinned to an old tag is unaffected by anything changed on `main`.
Verified with a probe: a consumer pinned to `v1.0.0` still received a built
`dist` after `main` moved its build to `prepack`.

The hazard is real but forward-looking — it applies to *future* pins at tags
containing the change, not to existing ones. The consumer migrations were still
worth doing on their own merits (46s → 2.5s installs, integrity hashes), they
were simply never a prerequisite for Task 3.

## Carry-forward for any future consumer work

**Consumers cannot detect "SUI is npm-linked" by testing for
`node_modules/@primestageprime/solid-ui-components/src`.** SUI's `files` became
`["dist", "src"]` in `ef99119`, first released in **v0.126.0**, so `src/` now
ships in the published package. Measured against a real v0.126.0 install:

| | `existsSync(pkg/src)` | `lstatSync(pkg).isSymbolicLink()` |
|---|---|---|
| Normal install | **`true`** ❌ | `false` ✅ |
| Symlinked (`npm link`) | `true` ✅ | `true` ✅ |

The path check carries no signal at all against v0.126.0+ — it returns `true`
unconditionally and can never select dist mode again. Test for the symlink
instead. Shipping `src` is deliberate: the `exports` map's `"source"` condition
is what it exists to serve, so the fix belongs in the consumer, not in SUI's
`files`.
