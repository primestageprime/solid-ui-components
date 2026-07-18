// fn — pluck (Depth 0, pure). Data-last: `pluck("id")` maps an array to the
// array of that property in one step — the common `xs.map(x => x.id)` shape.
// (A data-last accessor recovers the property's value type here because the
// element type is inferred from the array it is applied to.)
export function pluck<K extends PropertyKey>(
  key: K,
): <T extends { [P in K]: unknown }>(array: readonly T[]) => T[K][] {
  return (array) => array.map((el) => el[key]);
}
