// ============================================
// Layout-purity regression harness.
//
// A layout-purity refactor swaps hand-rolled flex/grid wrappers for Layout
// compositions. The public props stay byte-identical and the render should stay
// visually identical — but the DOM tree (which classes sit on which elements)
// legitimately changes. What must NOT change silently is the STRUCTURE the
// consumer sees: same children in the same order, same text, same key semantic
// attributes. This helper serializes a rendered subtree into a compact,
// stable, human-diffable tree so an accidental prop/DOM regression fails loudly
// in a snapshot while the class-name churn of the refactor is expected.
//
// It captures tag + class list + a curated set of semantic attributes + leaf
// text — NOT full innerHTML (too brittle) and NOT inline styles (they move into
// Layout variants during a migration, so asserting on them would fight the
// refactor). Compare the SAME ARGUMENTS → SAME RENDER: render with fixed props
// before and after, and diff the structure.
// ============================================

/** Attributes worth capturing for regression — semantics a consumer relies on,
 *  stable across a geometry refactor. Deliberately excludes `style` and `class`
 *  (class is captured separately; style churns during migration). */
const CAPTURED_ATTRS = [
  "role",
  "aria-label",
  "aria-hidden",
  "aria-selected",
  "aria-expanded",
  "aria-checked",
  "type",
  "href",
  "disabled",
  "data-status",
  "data-active",
  "data-selected",
  "data-state",
];

export interface DomStructureOptions {
  /** Include leaf text nodes (default true). Text is deterministic under fixed
   *  props, so it catches "the label vanished" regressions. */
  text?: boolean;
  /** Drop these classes before serializing — useful for ignoring hash/util
   *  classes that are noise. Matched exactly. */
  ignoreClasses?: string[];
}

function serializeClasses(el: Element, ignore: Set<string>): string {
  const classes = Array.from(el.classList)
    .filter((c) => !ignore.has(c))
    .sort(); // sorted → order-independent, stable across class-list reshuffles
  return classes.length ? `.${classes.join(".")}` : "";
}

function serializeAttrs(el: Element): string {
  const parts: string[] = [];
  for (const name of CAPTURED_ATTRS) {
    if (el.hasAttribute(name)) {
      const v = el.getAttribute(name);
      parts.push(v === "" ? `[${name}]` : `[${name}=${v}]`);
    }
  }
  return parts.join("");
}

function walk(
  node: Node,
  depth: number,
  lines: string[],
  opts: Required<DomStructureOptions>,
  ignore: Set<string>,
): void {
  const indent = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    if (!opts.text) return;
    const text = (node.textContent ?? "").trim();
    if (text) lines.push(`${indent}"${text}"`);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  lines.push(`${indent}${tag}${serializeClasses(el, ignore)}${serializeAttrs(el)}`);
  for (const child of Array.from(el.childNodes)) {
    walk(child, depth + 1, lines, opts, ignore);
  }
}

/**
 * Serialize a rendered DOM subtree into a stable tag/class/attr/text tree.
 * Feed it the `container` from `@solidjs/testing-library`'s `render` (or any
 * Element) and compare across a refactor with `toMatchSnapshot` or a captured
 * baseline string.
 */
export function domStructure(
  root: Element,
  options: DomStructureOptions = {},
): string {
  const opts: Required<DomStructureOptions> = {
    text: options.text ?? true,
    ignoreClasses: options.ignoreClasses ?? [],
  };
  const ignore = new Set(opts.ignoreClasses);
  const lines: string[] = [];
  for (const child of Array.from(root.childNodes)) {
    walk(child, 0, lines, opts, ignore);
  }
  return lines.join("\n");
}
