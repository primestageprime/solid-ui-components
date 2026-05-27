import { defineConfig, type Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { mkdirSync, readdirSync, copyFileSync } from "fs";
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

// Build target selected via SUI_BUILD_TARGET env var.
// - "client" (default): browser/ESM bundle with DOM-targeted Solid output. Emits dist/index.js.
// - "server": Node/SSR-safe bundle built with solid-plugin ssr=true. Emits dist/server.js.
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
// SSR-safe `ssr()` / `ssrElement()` calls as part of our dist/server.js.
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
      !isDev && !isServerBuild && copyThemes(),
    ].filter(Boolean),
    root: isDev ? "dev" : undefined,
    build: isDev
      ? {}
      : isServerBuild
        ? {
            // SSR build — invoked via `vite build --ssr src/index.ts`.
            // Produce dist/server.js alongside (not replacing) the client dist/index.js.
            emptyOutDir: false,
            ssr: true,
            outDir: "dist",
            rollupOptions: {
              input: resolve(__dirname, "src/index.ts"),
              external: SERVER_ROLLUP_EXTERNALS,
              output: {
                format: "es",
                entryFileNames: "server.js",
                chunkFileNames: "server-[name]-[hash].js",
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
            // Client/browser build — unchanged from v0.4.0 behavior.
            lib: {
              entry: resolve(__dirname, "src/index.ts"),
              name: "SolidUIComponents",
              formats: ["es"],
              fileName: "index",
            },
            rollupOptions: {
              external: CLIENT_ROLLUP_EXTERNALS,
              output: {
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
