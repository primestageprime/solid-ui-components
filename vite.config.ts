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

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [
      solidPlugin(),
      !isDev && dts({
        insertTypesEntry: true,
      }),
      !isDev && copyThemes(),
    ].filter(Boolean),
    root: isDev ? "dev" : undefined,
    build: isDev ? {} : {
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        name: "SolidUIComponents",
        formats: ["es"],
        fileName: "index",
      },
      rollupOptions: {
        external: ["solid-js", "solid-js/web", "solid-js/store", "katex", "d3-dag", "@thisbeyond/solid-dnd"],
        output: {
          globals: {
            "solid-js": "solidJs",
            "solid-js/web": "solidJsWeb",
            "solid-js/store": "solidJsStore",
          },
        },
      },
    },
    resolve: {
      alias: {
        "~": resolve(__dirname, "./src"),
      },
    },
  };
});
