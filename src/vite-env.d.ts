/// <reference types="vite/client" />

// Vite's `?raw` query suffix returns the file contents as a string at
// build/runtime. `src/themes/manifest.ts` uses this to bundle each
// theme's CSS as a string the loader can inject. TypeScript doesn't
// know about Vite's URL-query module suffixes without this declaration.
declare module "*.css?raw" {
  const content: string;
  export default content;
}
