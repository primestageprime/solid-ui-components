// Where things are, from this file's place in the repo.
import { fileURLToPath } from "node:url";
import type { Roots } from "./suiResolve.ts";

const here = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url));

export const SUI_SRC = here("../../src");
export const ROOTS: Roots = {
  components: here("../../src/components"),
  mirror: here("../src"),
};
export const ICON_SOURCE = here("../../src/components/Icon/Icon.tsx");
