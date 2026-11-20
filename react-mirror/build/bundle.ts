// The esbuild shell around resolveSui: src/index.ts as ONE classic script
// assigning window.Sui, reading React from the page (window.React,
// window.ReactDOM) as the design system's previews and canvases provide it.
import { existsSync, readFileSync } from "node:fs";
import { build, type Plugin } from "esbuild";
import { iconModule } from "./icons.ts";
import { ICON_SOURCE, ROOTS, SUI_SRC } from "./roots.ts";
import { resolveSui } from "./suiResolve.ts";

const ENTRY = new URL("../src/index.ts", import.meta.url).pathname;

/** The page's React, by specifier. */
export const GLOBALS: Readonly<Record<string, string>> = {
  react: "module.exports = window.React;",
  "react-dom": "module.exports = window.ReactDOM;",
  "react-dom/client": "module.exports = window.ReactDOM;",
  // jsxs marks its children array as static (written out in the source), so it
  // is spread into createElement rather than passed as a list needing keys.
  "react/jsx-runtime": [
    "const R = window.React;",
    "const keyed = (p, k) => (k === undefined ? p : { ...p, key: k });",
    "const jsx = (t, p, k) => R.createElement(t, keyed(p, k));",
    "const jsxs = (t, p, k) => { const { children, ...rest } = keyed(p, k); return R.createElement(t, rest, ...children); };",
    "module.exports = { jsx, jsxs, Fragment: R.Fragment };",
  ].join("\n"),
};

const globalsPlugin: Plugin = {
  name: "page-react",
  setup(b) {
    b.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (args) =>
      args.path in GLOBALS
        ? { path: args.path, namespace: "page-react" }
        : { errors: [{ text: `no page global for ${args.path}` }] },
    );
    b.onLoad({ filter: /.*/, namespace: "page-react" }, (args) => ({
      contents: GLOBALS[args.path] ?? "",
      loader: "js",
    }));
  },
};

const suiPlugin: Plugin = {
  name: "sui-react",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.namespace !== "file" || args.kind === "entry-point") return;
      const flavored = args.importer.startsWith(SUI_SRC);
      const r = resolveSui(
        args.path,
        { path: args.importer, flavored },
        ROOTS,
        existsSync,
      );
      switch (r.kind) {
        case "sui":
        case "react":
          return { path: r.path };
        case "icons":
          return { path: "icons", namespace: "sui-icons" };
        case "refuse":
          return { errors: [{ text: r.reason }] };
        case "pass":
          return undefined;
      }
    });
    b.onLoad({ filter: /.*/, namespace: "sui-icons" }, () => ({
      contents: iconModule(readFileSync(ICON_SOURCE, "utf8")),
      loader: "ts",
    }));
  },
};

/** bundle.js and the component CSS its modules import. */
export const buildBundle = async (): Promise<{
  readonly js: string;
  readonly css: string;
}> => {
  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    outdir: "out",
    format: "iife",
    globalName: "Sui",
    platform: "browser",
    target: "es2020",
    minify: true,
    legalComments: "none",
    footer: { js: "window.Sui=Sui;" },
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [globalsPlugin, suiPlugin],
    logLevel: "silent",
  });
  const text = (ext: string): string =>
    result.outputFiles.find((f) => f.path.endsWith(ext))?.text ?? "";
  return { js: text(".js"), css: text(".css") };
};
