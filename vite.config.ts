import { defineConfig, type Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import devtools from "solid-devtools/vite";

function copyThemes(): Plugin {
  return {
    name: "copy-themes",
    closeBundle() {
      const srcDir = resolve(__dirname, "src/themes");
      const distDir = resolve(__dirname, "dist/themes");
      mkdirSync(distDir, { recursive: true });
      for (const file of readdirSync(srcDir)) {
        if (file.endsWith(".css")) {
          copyFileSync(resolve(srcDir, file), resolve(distDir, file));
        }
      }
    },
  };
}

// MathFormula.tsx keeps `import "katex/dist/katex.min.css"` so that dev/serve
// and source-linked consumers style formulas correctly. In the LIBRARY BUILD
// only, that import is stubbed to an empty stylesheet — the real one ships as
// dist/katex.css beside real font files (see copyKatexAssets below). Without
// the stub, Vite inlines all 60 fonts into dist/index.css as base64.
const KATEX_CSS_ID = "katex/dist/katex.min.css";
const KATEX_CSS_STUB = "\0sui-katex-css-stub.css";

function stubKatexCss(): Plugin {
  return {
    name: "stub-katex-css",
    enforce: "pre",
    resolveId(id) {
      return id === KATEX_CSS_ID ? KATEX_CSS_STUB : null;
    },
    load(id) {
      // Empty stylesheet: the rules arrive via dist/katex.css instead.
      return id === KATEX_CSS_STUB ? "" : null;
    },
  };
}

// KaTeX's stylesheet ships as a real file next to real font files, instead of
// being `import`ed by MathFormula.tsx. See
// docs/adr/0006-katex-css-fonts-not-inlined.md.
//
// The problem: Vite's LIBRARY mode inlines every referenced asset as a base64
// `data:` URI regardless of size — `assetsInlineLimit` is ignored there
// (verified: setting it to 0 changed nothing). So a single
// `import "katex/dist/katex.min.css"` embedded all 60 KaTeX font files into
// dist/index.css: 1,436,824 bytes, 78.5% of the stylesheet, shipped eagerly to
// every consumer even though four of the five render no formulas at all.
// Inlining also defeats the two things @font-face normally does for free —
// fonts download lazily, and only in the ONE format the browser picks. Inlined,
// all three formats (woff2 + woff + ttf) download unconditionally.
//
// The fix: copy katex.min.css to dist/katex.css and its fonts to dist/fonts/.
// KaTeX references its fonts as `url(fonts/…)`, so that relative path resolves
// as-is with no rewriting. dist/index.css then gets an `@import "./katex.css"`
// prepended (see prependKatexImport), which keeps every existing consumer
// working untouched while the ~1.1 MB of fonts stay external and lazy.
function copyKatexAssets(): Plugin {
  return {
    name: "copy-katex-assets",
    closeBundle() {
      const katexDist = resolve(__dirname, "node_modules/katex/dist");
      copyFileSync(
        resolve(katexDist, "katex.min.css"),
        resolve(__dirname, "dist/katex.css"),
      );
      const fontsOut = resolve(__dirname, "dist/fonts");
      mkdirSync(fontsOut, { recursive: true });
      for (const file of readdirSync(resolve(katexDist, "fonts"))) {
        copyFileSync(
          resolve(katexDist, "fonts", file),
          resolve(fontsOut, file),
        );
      }
    },
  };
}

// `@import` must precede every other rule in a stylesheet, so this prepends
// rather than appends. Bundlers inline the @import at build time, so consumers
// pay no extra round trip; a raw <link> resolves ./katex.css as a sibling in
// dist/. Idempotent — re-running a build must not stack duplicate imports.
function prependKatexImport(): Plugin {
  return {
    name: "prepend-katex-import",
    closeBundle() {
      const cssPath = resolve(__dirname, "dist/index.css");
      const css = readFileSync(cssPath, "utf8");
      const directive = '@import "./katex.css";';
      if (css.startsWith(directive)) return;
      writeFileSync(cssPath, `${directive}\n${css}`);
    },
  };
}

// Build target selected via SUI_BUILD_TARGET env var.
// - "client" (default): browser/ESM bundle with DOM-targeted Solid output. Emits dist/index.js.
// - "server": Node/SSR-safe bundle built with solid-plugin ssr=true. Emits
//   dist/server/ (one file per module; entry dist/server/index.js).
// Two sequential `vite build` invocations produce both bundles (see npm scripts).
type BuildTarget = "client" | "server";

const RESOLVED_TARGET: BuildTarget =
  (process.env.SUI_BUILD_TARGET as BuildTarget) ?? "client";

// Packages that ship their own Solid build and must stay external to the bundle.
// `@kobalte/core` and its subpath entries (e.g. `@kobalte/core/tooltip`) are
// downstream peer/direct deps — bundling them would fork Solid state.
const KOBALTE_EXTERNAL_PATTERN = /^@kobalte\/core(\/.+)?$/;

const BASE_EXTERNALS: string[] = [
  "solid-js",
  "solid-js/web",
  "solid-js/store",
  "katex",
  "d3-dag",
];

// Client build: kobalte is external — the host app depends on it directly, so
// avoid double-bundling (and forking Solid context/singletons).
const CLIENT_ROLLUP_EXTERNALS: (string | RegExp)[] = [
  ...BASE_EXTERNALS,
  KOBALTE_EXTERNAL_PATTERN,
];

// Server build: kobalte is inlined (noExternal). Kobalte publishes compiled
// `.js` whose top-level `template(...)` / `setAttribute(...)` side effects
// come from solid-js/web's browser codegen — importing that module in Node
// throws "Client-only API called on the server side" at module load. The fix
// is to let vite-plugin-solid (ssr: true) re-resolve kobalte through its
// `"solid": "./dist/*/index.jsx"` condition and re-compile its JSX to
// SSR-safe `ssr()` / `ssrElement()` calls as part of our dist/server/ output.
const SERVER_ROLLUP_EXTERNALS: (string | RegExp)[] = [...BASE_EXTERNALS];
const SSR_EXTERNALS: string[] = [...BASE_EXTERNALS];

export default defineConfig(({ command, mode }) => {
  const isDev = mode === "development";
  const isServe = command === "serve";
  const isServerBuild = !isDev && RESOLVED_TARGET === "server";

  return {
    plugins: [
      // Solid DevTools — dev gallery only, never included in library builds.
      // Gated on `command === "serve"` so it is completely absent from
      // `build:client` (SUI_BUILD_TARGET=client) and `build:server` runs.
      isServe && devtools({ autoname: true }),
      // For the server bundle, turn on SSR codegen in vite-plugin-solid so
      // JSX compiles to ssr()/ssrElement() instead of template()/insert()/etc.
      // The resulting bundle has no top-level imports of DOM-only symbols
      // (setStyleProperty, use, template, spread, insert, ...) from solid-js/web.
      solidPlugin(isServerBuild ? { ssr: true } : undefined),
      // .d.ts emission is handled by the client build only — server bundle
      // reuses the same type surface (shared dist/index.d.ts entrypoint).
      !isDev && !isServerBuild && dts({
        insertTypesEntry: true,
      }),
      // Only copy themes once — during the client build (the default target).
      // Library builds only — dev/serve must load the real katex stylesheet.
      // Applies to BOTH client and server builds so neither inlines fonts.
      !isDev && !isServe && stubKatexCss(),
      !isDev && !isServerBuild && copyThemes(),
      // Order matters: copy katex.css into dist BEFORE prepending the @import
      // that points at it.
      !isDev && !isServerBuild && copyKatexAssets(),
      !isDev && !isServerBuild && prependKatexImport(),
    ].filter(Boolean),
    root: isDev ? "dev" : undefined,
    build: isDev
      ? {}
      : isServerBuild
        ? {
            // SSR build — invoked via `vite build --ssr src/index.ts`.
            // Produce dist/server/ alongside (not replacing) the client dist/index.js.
            emptyOutDir: false,
            ssr: true,
            outDir: "dist",
            rollupOptions: {
              input: resolve(__dirname, "src/index.ts"),
              external: SERVER_ROLLUP_EXTERNALS,
              output: {
                format: "es",
                // SAME pair as the client build (see the note there and
                // docs/adr/0005-per-module-dist-and-sideeffects.md). The SSR
                // bundle was a single dist/server.js until 2026-08-03, which
                // left every consumer resolving the "node" export condition
                // with the exact defect ADR 0005 fixed for the browser: one
                // button pulled in inlined Kobalte popper/tooltip code and bare
                // `import "d3-dag"; import "katex"` statements that Rollup
                // cannot remove from a single-file bundle. 129,330 B -> 953 B.
                //
                // Emitted under dist/server/ rather than as dist/server*.js so
                // the module paths stay readable and cannot collide with the
                // client build's output in the shared dist/ (emptyOutDir is
                // false here — the client build runs first and owns the wipe).
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: "server/[name].js",
                chunkFileNames: "server/[name]-[hash].js",
                assetFileNames: (assetInfo) => {
                  // Drop the SSR-build's CSS; the client build already emits dist/index.css.
                  if (assetInfo.name && assetInfo.name.endsWith(".css")) {
                    return "server.[ext]";
                  }
                  return "[name].[ext]";
                },
              },
            },
          }
        : {
            // Client/browser build.
            // minify:false keeps identifier NAMES in the dist. Consumers bundle
            // + re-minify SUI in their own build, so shipping unminified is fine
            // — and it prevents a nasty dev-only footgun: when a consumer's dev
            // server runs Solid HMR (solid-refresh) over this dist, solid-refresh
            // wraps any CAPITALIZED top-level function as a component. A minifier
            // was renaming d3's `scaleLinear` to a capitalized `Li`, so it got
            // wrapped and called with a props arg -> `scaleLinear(undefined)` ->
            // ScrubChart crash. Preserving names keeps d3's lowercase identifiers
            // (scaleLinear/continuous/…) untouched; only real (capitalized)
            // components are wrapped, which is correct.
            minify: false,
            lib: {
              // Two entries. The barrel is the library; the shim is a
              // side-effect module a consumer lists in their vitest
              // `setupFiles`, so nothing imports it and preserveModules alone
              // would never emit it. See package.json
              // "./testing/jsdom-nan-shim".
              entry: {
                index: resolve(__dirname, "src/index.ts"),
                "testing/jsdomNaNDeclarationShim": resolve(
                  __dirname,
                  "src/testing/jsdomNaNDeclarationShim.ts",
                ),
              },
              name: "SolidUIComponents",
              formats: ["es"],
            },
            rollupOptions: {
              external: CLIENT_ROLLUP_EXTERNALS,
              output: {
                // Vite names a lib-mode CSS asset after `lib.fileName` for a
                // single entry and after `lib.name` for several. This build
                // has two entries, so without this the stylesheet would land
                // as dist/solid-ui-components.css and break the
                // "./index.css" export every consumer imports.
                assetFileNames: (assetInfo) =>
                  (assetInfo.names ?? []).some((n) => n.endsWith(".css"))
                    ? "index.css"
                    : "[name].[ext]",
                // PAIRED with `"sideEffects"` in package.json — see
                // docs/adr/0005-per-module-dist-and-sideeffects.md. Do not
                // remove one without the other; each is inert alone, which is
                // exactly how they get deleted as "dead config".
                //
                // One file per source module instead of a single bundled
                // index.js. That granularity is what `sideEffects` acts ON: a
                // consumer's bundler can drop a whole unused module file, and
                // with it the module-scope imports of heavyweight deps that
                // only one component needs (katex ~227 KB via MathFormula,
                // d3-dag ~63 KB via DagChart). Those deps declare no
                // `sideEffects` of their own, so in a single-bundle build they
                // are unremovable — a consumer importing one Button shipped
                // 333 KB, of which 318 KB was libraries it never called.
                // With both settings: 15 KB. Measured, see the ADR.
                preserveModules: true,
                preserveModulesRoot: "src",
                globals: {
                  "solid-js": "solidJs",
                  "solid-js/web": "solidJsWeb",
                  "solid-js/store": "solidJsStore",
                },
              },
            },
          },
    // The server bundle must resolve `solid-js/web` to its server entry at build time
    // so the Solid babel SSR transform sees the right exports and type surface.
    // At runtime, consumers' Node resolution does this naturally via the "node" condition.
    // We also add the `solid` condition so kobalte's `"solid": "./dist/*/index.jsx"`
    // export wins over its compiled `.js` — vite-plugin-solid (ssr: true) then
    // recompiles that JSX to SSR-safe `ssr()` / `ssrElement()` calls.
    resolve: {
      alias: {
        "~": resolve(__dirname, "./src"),
      },
      conditions: isServerBuild
        ? ["solid", "node", "import", "default"]
        : undefined,
    },
    ssr: isServerBuild
      ? {
          // Inline kobalte + its subpackages so we see their source JSX and compile
          // it through solid-plugin ssr=true. Without this, Node's at-runtime
          // import of @kobalte/core executes its pre-compiled `template(...)` calls
          // against solid-js/web's server shim and throws "Client-only API called
          // on the server side" the instant a consumer imports solid-ui-components.
          noExternal: [
            /^@kobalte\//,
            /^@solid-primitives\//,
            "@floating-ui/dom",
            "@internationalized/date",
            "@internationalized/number",
            "solid-presence",
            "solid-prevent-scroll",
          ],
          external: SSR_EXTERNALS,
        }
      : undefined,
  };
});
