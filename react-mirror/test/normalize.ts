// A rendered tree reduced to what a stylesheet and a screen reader see:
// tags, attributes (generated ids blanked), normalized style, and text.
export interface Shape {
  readonly tag: string;
  readonly attrs: readonly (readonly [string, string])[];
  readonly children: readonly (Shape | string)[];
}

// Ids are generated (Kobalte's "slider-cl-3"), so they are dropped, and an
// attribute that points at one keeps only the fact that it points somewhere.
const GENERATED = new Set(["id", "name"]);
const ID_REFERENCES = new Set([
  "for",
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
]);

/** Declarations sorted, so the order a renderer happened to set them in is moot. */
const styleText = (el: Element): string =>
  (el as HTMLElement).style.cssText
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d !== "")
    .sort()
    .join("; ");

const attributeValue = (el: Element, name: string, value: string): string => {
  if (ID_REFERENCES.has(name)) return "<id>";
  if (name === "style") return styleText(el);
  return value;
};

type Item = Shape | string;

/** The text of the run of strings starting at `start`, joined. */
const runFrom = (items: readonly Item[], start: number): string => {
  const end = items.findIndex(
    (item, i) => i > start && typeof item !== "string",
  );
  return items.slice(start, end === -1 ? undefined : end).join("");
};

/** Child elements as shapes; adjacent text joined (renderers split it differently); empty text dropped. */
const textOf = (nodes: readonly ChildNode[]): Item[] => {
  const items: Item[] = nodes.flatMap((node): Item[] =>
    node.nodeType === 3
      ? [node.textContent ?? ""]
      : node.nodeType === 1
        ? [shape(node as Element)]
        : [],
  );
  return items
    .flatMap((item, i): Item[] => {
      if (typeof item !== "string") return [item];
      return typeof items[i - 1] === "string" ? [] : [runFrom(items, i)];
    })
    .filter((item) => item !== "");
};

export const shape = (el: Element): Shape => ({
  tag: el.tagName.toLowerCase(),
  attrs: [...el.attributes]
    .filter((a) => !GENERATED.has(a.name))
    .map((a): readonly [string, string] => [
      a.name,
      attributeValue(el, a.name, a.value),
    ])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  children: textOf([...el.childNodes]),
});
