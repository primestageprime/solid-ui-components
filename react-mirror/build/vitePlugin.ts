// Vite shell around resolveSui, for the tests. A module opened through `sui:`
// carries a `?sui-react` suffix, so the Solid side of the drift test can load
// the very same file unflavored without the two sharing a module instance.
import { existsSync, readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { iconModule } from "./icons.ts";
import { ICON_SOURCE, ROOTS, SUI_SRC } from "./roots.ts";
import { resolveSui } from "./suiResolve.ts";

const FLAVOR = "?sui-react";
const ICONS = "\0sui-icons";

const isRelative = (s: string): boolean =>
  s.startsWith("./") || s.startsWith("../");

export const suiVitePlugin = (): Plugin => ({
  name: "sui-react",
  enforce: "pre",
  async resolveId(source, importer) {
    const flavored = importer?.endsWith(FLAVOR) ?? false;
    const path =
      importer?.slice(0, flavored ? -FLAVOR.length : undefined) ?? "";
    const r = resolveSui(source, { path, flavored }, ROOTS, existsSync);
    switch (r.kind) {
      case "sui":
        return `${r.path}${FLAVOR}`;
      case "icons":
        return ICONS;
      case "react":
        return r.path;
      case "refuse":
        return this.error(r.reason);
      case "pass": {
        if (!flavored || !isRelative(source)) return null;
        const resolved = await this.resolve(source, path, { skipSelf: true });
        if (!resolved) return null;
        return resolved.id.startsWith(SUI_SRC) && /\.tsx?$/.test(resolved.id)
          ? `${resolved.id}${FLAVOR}`
          : resolved;
      }
    }
  },
  load(id) {
    if (id === ICONS) return iconModule(readFileSync(ICON_SOURCE, "utf8"));
    if (id.endsWith(FLAVOR))
      return readFileSync(id.slice(0, -FLAVOR.length), "utf8");
    return null;
  },
});
