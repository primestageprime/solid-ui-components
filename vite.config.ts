import { defineConfig, type Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { mkdirSync, readdirSync, copyFileSync } from "fs";

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

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const isServerBuild = !isDev && RESOLVED_TARGET === "server";

  return {
    plugins: [
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
              external: ["solid-js", "solid-js/web", "solid-js/store", "katex", "d3-dag"],
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
              external: ["solid-js", "solid-js/web", "solid-js/store", "katex", "d3-dag"],
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
    resolve: {
      alias: {
        "~": resolve(__dirname, "./src"),
      },
      conditions: isServerBuild
        ? ["node", "import", "default"]
        : undefined,
    },
    ssr: isServerBuild
      ? {
          noExternal: [],
          external: ["solid-js", "solid-js/web", "solid-js/store", "katex", "d3-dag"],
        }
      : undefined,
  };
});
