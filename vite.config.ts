import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [
      solidPlugin(),
      !isDev && dts({
        insertTypesEntry: true,
      }),
    ].filter(Boolean),
    root: isDev ? "dev" : undefined,
    build: isDev ? {} : {
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        name: "JTFComponents",
        formats: ["es"],
        fileName: "index",
      },
      rollupOptions: {
        external: ["solid-js", "solid-js/web", "solid-js/store", "katex"],
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
