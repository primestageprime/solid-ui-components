// How the mirror reaches SUI's own sources. Pure: the build (esbuild) and the
// tests (vite) wrap it in their own plugin shells.
//
// A `sui:<path>` specifier names a module under SUI's src/components and opens
// it FLAVORED: inside it, an import of one of SUI's Solid base modules (the
// factories its variant table calls) resolves to the mirror's React base of
// the same name instead. So `sui:Button/variants` is SUI's own variant table,
// every `createButton({...})` in it building a React button. A flavored import
// of any OTHER Solid component is refused, loudly: that is SUI growing a
// dependency the mirror has no base for, which must fail the build rather than
// drag Solid into a React bundle.
import { dirname, join, normalize } from "node:path";

/** Where SUI's components and the mirror's sources live. */
export interface Roots {
  readonly components: string;
  readonly mirror: string;
}

/** The module asking, and whether it was opened flavored. */
export interface Importer {
  readonly path: string;
  readonly flavored: boolean;
}

export type Resolution =
  | { readonly kind: "sui"; readonly path: string }
  | { readonly kind: "icons"; readonly path: string }
  | { readonly kind: "react"; readonly path: string }
  | { readonly kind: "refuse"; readonly reason: string }
  | { readonly kind: "pass" };

/** SUI base module (under components/, no extension) → the mirror's file. */
export const FACTORY_BASES: Readonly<Record<string, string>> = {
  "Button/Button": "Button.tsx",
  "Layout/Stack": "Layout.tsx",
  "Layout/Row": "Layout.tsx",
  "Layout/Box": "Layout.tsx",
  "Layout/Grid": "Layout.tsx",
  "Layout/AppShell": "Layout.tsx",
  "Surface/Surface": "Surface.tsx",
  "Text/Text": "Text.tsx",
  "Divider/Divider": "Divider.tsx",
  "Icon/Icon": "Icon.tsx",
  "MarkedSlider/MarkedSlider": "MarkedSlider.tsx",
};

const EXTENSIONS = [".ts", ".tsx", "/index.ts"] as const;

const firstExisting = (
  base: string,
  exists: (path: string) => boolean,
): string | undefined => EXTENSIONS.map((ext) => `${base}${ext}`).find(exists);

const isRelative = (specifier: string): boolean =>
  specifier.startsWith("./") || specifier.startsWith("../");

const stripExtension = (path: string): string =>
  path.replace(/\.(tsx?|jsx?)$/, "");

export const resolveSui = (
  specifier: string,
  importer: Importer,
  roots: Roots,
  exists: (path: string) => boolean,
): Resolution => {
  if (specifier === "sui:Icon/paths") {
    return { kind: "icons", path: join(roots.components, "Icon/Icon.tsx") };
  }
  if (specifier.startsWith("sui:")) {
    const rest = specifier.slice("sui:".length);
    const found = firstExisting(join(roots.components, rest), exists);
    return found
      ? { kind: "sui", path: found }
      : { kind: "refuse", reason: `no SUI module at components/${rest}` };
  }
  if (!importer.flavored || !isRelative(specifier)) return { kind: "pass" };

  const target = stripExtension(
    normalize(join(dirname(importer.path), specifier)),
  );
  const key = target.startsWith(`${roots.components}/`)
    ? target.slice(roots.components.length + 1)
    : undefined;
  const base = key === undefined ? undefined : FACTORY_BASES[key];
  if (base !== undefined) {
    return { kind: "react", path: join(roots.mirror, base) };
  }
  if (exists(`${target}.tsx`)) {
    return {
      kind: "refuse",
      reason: `${importer.path} imports the Solid component ${specifier}, which has no React base in react-mirror (add one to FACTORY_BASES)`,
    };
  }
  return { kind: "pass" };
};
