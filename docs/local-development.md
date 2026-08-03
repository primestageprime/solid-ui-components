# Local development against SUI source

When you're iterating on SUI locally and consuming it from another Solid app
(e.g. via `npm link`, a file: dependency, or a workspace), this guide shows
how to make the consumer's dev server read from SUI's TypeScript source
instead of the published `dist/` bundle.

## Why bother

Reading from source gives you three things you can't get from `dist/`:

1. **Readable component names in Solid DevTools.** SUI's library build minifies
   function names — `<Card>` becomes `<r_>` in your devtools tree. Source mode
   skips that mangling because the consumer's own Vite dev server doesn't
   minify in dev.
2. **`autoname` for signal / memo / store labels.** The
   `@solid-devtools/transform` Babel pass that powers `autoname` is a
   compile-time AST transform — it only runs on the original `.tsx`. Once a
   file is in `dist/index.js` the names are baked in (or gone).
3. **Instant HMR on SUI edits.** Edit a SUI component file, the consumer's
   dev server hot-reloads. No `npm run build` round-trip on the SUI side.

The trade-off is **slower cold-start** in the consumer — Vite now has to
compile 160+ TSX files instead of loading one pre-built ESM module. For a
normal dev loop this is paid once per server restart.

## Setup (consumer side)

### 1. Add the `source` condition to your Vite config

```ts
// vite.config.ts (in the consumer app)
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
  resolve: {
    // Put "source" first so it wins over "browser" / "import" when
    // resolving @primestageprime/solid-ui-components exports.
    conditions: ["source", "module", "browser", "import", "default"],
  },
  plugins: [
    devtools({
      autoname: true,
      // Optional — Alt-click any rendered DOM node to jump to the source file.
      locator: { targetIDE: "vscode", key: "Alt", jsxLocation: true, componentLocation: true },
    }),
    solidPlugin(),
  ],
});
```

### 2. Point the consumer at your local SUI checkout

Pick whichever fits your workflow:

- **npm link** (one-shot, machine-wide symlink):

  ```bash
  cd /path/to/solid-ui-components
  npm link
  cd /path/to/consumer
  npm link @primestageprime/solid-ui-components
  ```

- **`file:` dependency** (committed, per-consumer):

  ```jsonc
  // consumer's package.json
  "dependencies": {
    "@primestageprime/solid-ui-components": "file:../solid-ui-components"
  }
  ```

- **Workspace** (monorepo): add SUI's path to your `workspaces` array and
  let your package manager wire it up.

### 3. (Optional) Mirror the condition in tsconfig

By default `tsc` keeps reading types from `dist/index.d.ts` (via the `types`
condition) even when the runtime is on source. That works — `dist/index.d.ts`
is built from `src/index.ts`, so the surfaces match — but if you're actively
editing SUI source and don't want stale dist types to lie to you, point
TypeScript at source as well:

```jsonc
// consumer's tsconfig.json
{
  "compilerOptions": {
    "customConditions": ["source"]
  }
}
```

Needs TypeScript 5.0+ and `"moduleResolution": "bundler"` (or `"nodenext"`).

### 4. Start the consumer's dev server

That's it. Edits to SUI source hot-reload, the DevTools tree shows
`<Card>`, `<Section>`, etc., and inspecting a component shows
human-readable signal/memo names.

## Scoping source mode to your machine

If your team shares the consumer's `vite.config.ts` and you don't want
everyone forced onto source mode, gate the conditions list on an env var
or a `vite.config.local.ts` that's `.gitignore`d:

```ts
const useSuiSource = process.env.SUI_SOURCE === "1";

export default defineConfig({
  resolve: {
    conditions: useSuiSource
      ? ["source", "module", "browser", "import", "default"]
      : undefined, // Vite's defaults
  },
  plugins: [
    devtools({ autoname: true }),
    solidPlugin(),
  ],
});
```

Then run `SUI_SOURCE=1 vite` when you want source mode.

## Caveats

- **Peer deps must resolve from the consumer.** Source mode means the
  consumer's bundler walks SUI's import graph directly — `@kobalte/core`,
  `d3-scale`, `katex`, etc. must be installable from the consumer. They
  already are if SUI's normal `dist/` consumption works.
- **CSS still works.** Each component does `import "./Foo.css"` in source,
  and Vite's CSS side-effects handle the rest. Theme imports
  (`"@primestageprime/solid-ui-components/styles.css"`) also flip to source
  via the same `source` condition.
- **Production builds are unaffected.** The `source` condition is only
  active when the consumer explicitly lists it in `resolve.conditions`.
  Without the opt-in, every consumer keeps loading `dist/index.js` exactly
  as before.
- **SSR / Node consumers should not enable `source`.** The source-mode
  condition resolves to client-targeted TSX. If you SSR a consumer that
  imports SUI, leave `source` out of its server-side Vite config — the
  existing `"node"` condition will continue to pull the prebuilt SSR bundle
  (`dist/server/index.js`).
- **Source isn't currently shipped in the npm tarball.** This setup
  assumes you have SUI's working tree on disk (local link / file: /
  workspace). If we ever need to ship `src/` to npm consumers, add
  `"src"` to the `files` array in `package.json` and an `.npmignore`
  excluding tests.
