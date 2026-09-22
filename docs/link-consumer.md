# `npm run link:consumer` — cross-repo HMR against a local SUI checkout

`scripts/link-consumer.mjs` wires a local SUI checkout into a consumer app
via `npm link`, so the consumer's dev server resolves SUI's **source**
(`src/index.ts`, via the `source` export condition already in
`package.json`) instead of a published build — with HMR on SUI edits and no
`npm run build` / publish round-trip in the loop. See
`docs/local-development.md` for the generic source-mode mechanism this
builds on; this doc covers the script and the SolidStart/vinxi-specific
traps found proving it against thorcasting-ui (2026-09-22).

## Usage

```bash
# From the SUI checkout:
npm run link:consumer -- /path/to/consumer-app
npm run unlink:consumer -- /path/to/consumer-app
```

`link:consumer` runs `npm link` in this checkout (registers/repoints the
global symlink) then `npm link @primestageprime/solid-ui-components` in the
consumer, and checks the consumer's `app.config.ts` / `vite.config.ts` /
`vitest.config.ts` for a `SUI_SOURCE_LINKED`-style guard (see below); it
warns, but does not fail, if none is found. `unlink:consumer` removes the
link and runs `npm install` in the consumer to restore its registry-pinned
version — plain `npm install` on top of a link silently no-ops (it
reconciles against the lockfile's `link: true` and keeps the symlink), so
the script removes the symlink first.

## What has to be true on the consumer side

Proven against a SolidStart (vinxi) app — thorcasting-ui's `app.config.ts`
already carries this pattern permanently, guarded so a normal (non-linked)
install is unaffected:

```ts
const SUI_SOURCE_LINKED = (() => {
  try {
    return lstatSync("node_modules/@primestageprime/solid-ui-components").isSymbolicLink();
  } catch {
    return false;
  }
})();

export default defineConfig({
  vite: {
    resolve: {
      conditions: SUI_SOURCE_LINKED
        ? ["source", "solid", "module", "browser", "import", "default"]
        : undefined,
      // Without this, SUI's own `import "solid-js"` resolves through the
      // symlink's realpath to SUI's OWN node_modules/solid-js — a second
      // Solid runtime, which silently breaks reactivity/context.
      dedupe: ["solid-js", "solid-js/web", "solid-js/store"],
    },
    // The dep optimizer must not pre-bundle SUI (or Kobalte, which SUI's
    // source pulls in raw): pre-bundling resolves Kobalte to its `solid`
    // condition's raw JSX, which esbuild compiles with the default (React)
    // transform -> "React is not defined" at runtime.
    optimizeDeps: {
      exclude: ["@primestageprime/solid-ui-components", "@kobalte/core"],
    },
    server: {
      watch: {
        // Vite still watches the linked package's realpath. A `dist/`
        // rebuild on the SUI side (e.g. from a background `npm run build`)
        // fires a doomed HMR reload for `dist/index.css` that blanks every
        // page. Dev styling comes from source CSS, so `dist/` is inert here.
        ignored: ["**/solid-ui-components/dist/**"],
      },
    },
  },
});
```

If a consumer's dev server isn't a vinxi/SolidStart app, drop the
`optimizeDeps.exclude` / `watch.ignored` entries — they're vinxi-specific —
but keep the `SUI_SOURCE_LINKED` conditions swap and the `dedupe`. See
dside-ui's `app.config.ts` for the plain-Vite version (no dedupe needed
there because it resolves a single `solid-js` some other way — check before
assuming it's safe to drop).

## Traps hit proving this (2026-09-22, thorcasting-ui)

- **A bare SUI worktree with no `node_modules` still resolves modules** —
  Node's resolution walks up to an ancestor `node_modules` (the main SUI
  checkout's, three levels up from `.claude/worktrees/<id>/`) — but a
  script doing a literal `copyfile` from `node_modules/<pkg>/...` (SUI's
  `vite build` copies `katex.min.css` this way) fails with `ENOENT` because
  no local `node_modules` directory exists to satisfy the literal path.
  `npm link` runs SUI's `prepare` (build) script, so it hits this. Fix used
  here: `ln -s ../../../node_modules node_modules` in the worktree before
  linking. This is a known worktree gotcha (see the 2026-09-17 SUI diary
  entries on worktree `node_modules` sharing); it does not affect a normal
  (non-worktree) SUI checkout, which already has its own `node_modules`.
- **`vinxi dev`'s dep optimizer discovers SUI's transitive deps lazily** —
  `solid-devtools/setup`, `@primestageprime/auth0-stdb-client`,
  `spacetimedb`, `d3-scale`, `katex`, `d3-dag` all got pulled in newly once
  SUI's real import graph was in play, each discovery triggering "new
  dependencies optimized... reloading". During those reloads the page logs
  benign `Failed to load module script ... MIME type "text/css"` console
  errors for in-flight route-CSS manifest requests. These settle after the
  first cold start; they are not a sign the link is broken — confirm by
  reloading once eveything has stabilized and checking the page actually
  renders (it does).
- **Port**: pick a free port via `pa next --from 2300` (or `pa topo
  <consumer>` if it's already registered) rather than reusing the
  consumer's own configured dev port, so a worktree-based proof never
  collides with anyone's live dev server on that port.

## Verifying a link took

```bash
node -e "console.log(require('fs').lstatSync('node_modules/@primestageprime/solid-ui-components').isSymbolicLink())"
# -> true
```

Headlessly: open the consumer in the browser pane and check
`read_network_requests` for `_build/@fs/.../solid-ui-components/.../src/...`
URLs — if requests resolve into the SUI checkout's `src/` tree (not
`node_modules/@primestageprime/solid-ui-components/dist/`), source mode is
active. Then edit any SUI `.css` or `.tsx` file the consumer renders and
confirm the browser updates with **no reload call and no server restart** —
that's the actual HMR proof, not just that the symlink exists.
