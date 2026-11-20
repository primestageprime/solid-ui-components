import { fileURLToPath } from "node:url";
import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";
import { suiVitePlugin } from "./build/vitePlugin.ts";

const here = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url));

/** A path as a regex prefix: SUI's own src/, wherever the repo is checked out. */
const under = (path: string): string =>
  here(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Two JSX worlds in one run. vite-plugin-solid compiles SUI's own sources and
// the Solid half of the drift test (and nothing else); esbuild compiles the
// mirror's React JSX. `suiVitePlugin` gives the mirror SUI's own variant
// tables with their factories pointed at the React bases.
export default defineConfig({
  plugins: [
    suiVitePlugin(),
    solidPlugin({
      hot: false,
      include: [
        // By where SUI's sources ARE, not by the checkout's folder name: a
        // worktree or a clone under another name is still SUI.
        new RegExp(`^${under("../src/")}.*\\.[jt]sx$`),
        /react-mirror\/test\/solid\/.*\.tsx$/,
        /node_modules\/.+\.jsx$/,
      ],
    }),
  ],
  server: { fs: { allow: [here("..")] } },
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  resolve: {
    conditions: ["development", "browser"],
    alias: { "solid-fixture": here("./test/solid/fixture.tsx") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/**/*.test.{ts,tsx}",
      "build/**/*.test.ts",
      "test/**/*.test.{ts,tsx}",
    ],
    setupFiles: [here("../src/test-setup.ts")],
  },
});
