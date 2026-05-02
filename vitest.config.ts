import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

// Vitest config kept separate from vite.config.ts to avoid the build's SSR /
// dts plumbing. Tests run jsdom + the Solid testing-mode JSX transform.
export default defineConfig({
  plugins: [solidPlugin({ hot: false })],
  resolve: {
    conditions: ["development", "browser"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
