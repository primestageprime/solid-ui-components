import { defineConfig, type Plugin } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

// Vite's CSS plugin processes .css files even when ?raw is appended, returning
// an empty module in vitest's jsdom environment. This plugin intercepts raw CSS
// queries by aliasing them to virtual module IDs (base64-encoded, no ".css"
// extension) that the CSS plugin will not touch, then resolves those virtual
// IDs to the actual file contents via readFileSync.
const VIRTUAL_RAW_PREFIX = "\0raw-stylesheet:";

function rawCssPlugin(): Plugin {
  return {
    name: "raw-css",
    enforce: "pre",
    resolveId(source: string, importer?: string) {
      if (/\.css\?raw$/.test(source)) {
        // Resolve relative paths to absolute using the importer's directory,
        // then encode to a virtual ID whose path does NOT end with ".css" so
        // that Vite's CSS plugin does not run its transform on the result.
        const rawPath = source.replace(/\?raw$/, "");
        const absPath = importer
          ? resolve(dirname(importer), rawPath)
          : resolve(rawPath);
        // Use base64 encoding to avoid any extension-based plugin matching.
        const encoded = Buffer.from(absPath).toString("base64");
        return VIRTUAL_RAW_PREFIX + encoded;
      }
    },
    load(id: string) {
      if (id.startsWith(VIRTUAL_RAW_PREFIX)) {
        const encoded = id.slice(VIRTUAL_RAW_PREFIX.length);
        const filePath = Buffer.from(encoded, "base64").toString("utf8");
        try {
          const css = readFileSync(filePath, "utf8");
          return { code: `export default ${JSON.stringify(css)};`, map: null };
        } catch (err) {
          throw new Error(`rawCssPlugin: failed to read "${filePath}": ${(err as Error).message}`);
        }
      }
    },
  };
}

// Vitest config kept separate from vite.config.ts to avoid the build's SSR /
// dts plumbing. Tests run jsdom + the Solid testing-mode JSX transform.
export default defineConfig({
  plugins: [rawCssPlugin(), solidPlugin({ hot: false })],
  resolve: {
    conditions: ["development", "browser"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "dev/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/*.{test,spec}.{ts,tsx}",
    ],
    setupFiles: ["./src/test-setup.ts"],
    // Only produced under `npm run test:coverage`; `npm test` is unaffected.
    // `all` is what makes a module nobody imports appear in the report at 0
    // instead of being omitted — the whole point of the componentsNeverExecuted
    // metric is the files nothing touches. Scoped to component modules so the
    // report stays about the library surface.
    coverage: {
      provider: "v8",
      include: ["src/components/**/*.{ts,tsx}"],
      exclude: ["**/*.{test,spec}.{ts,tsx}"],
      all: true,
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
