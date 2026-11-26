// SUI's theme sheets, scoped so two can share one stylesheet: every rule of a
// theme applies only while the page's `<html data-theme>` selects it. The
// scope is wrapped in `:where()`, so each rule keeps exactly the specificity
// SUI gave it and the cascade between theme and component CSS is unchanged.
import postcss, { type AtRule, type Rule } from "postcss";

const LEADING_ROOT = /^(:root|html)(?=$|[\s.:#[>+~])/;

/** One selector, narrowed to `condition` (an attribute test on <html>, e.g. `[data-theme="light"]`). */
export const scopeSelector = (selector: string, condition: string): string => {
  const trimmed = selector.trim();
  const root = LEADING_ROOT.exec(trimmed);
  if (root) {
    return `${root[1]}:where(${condition})${trimmed.slice(root[1]?.length ?? 0)}`;
  }
  return `:where(:root${condition}) ${trimmed}`;
};

const insideKeyframes = (rule: Rule): boolean => {
  const parent = rule.parent;
  return (
    parent?.type === "atrule" && /keyframes$/i.test((parent as AtRule).name)
  );
};

/** Every style rule of `css` scoped to `condition`; keyframes and @font-face untouched. */
export const scopeSheet = (css: string, condition: string): string => {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (insideKeyframes(rule)) return;
    rule.selectors = rule.selectors.map((s) => scopeSelector(s, condition));
  });
  return root.toString();
};

/** A sheet's top-level @import params, and the sheet without them. */
export const stripImports = (
  css: string,
): { readonly imports: readonly string[]; readonly css: string } => {
  const root = postcss.parse(css);
  const imports: string[] = [];
  root.each((node) => {
    if (node.type === "atrule" && node.name === "import")
      imports.push(node.params);
  });
  root.walkAtRules("import", (node) => {
    node.remove();
  });
  return { imports, css: root.toString().trim() };
};
