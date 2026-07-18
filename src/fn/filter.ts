// fn — filter (Depth 0, pure). Data-last over a readonly array. The first
// overload accepts a type-guard predicate and narrows the element type, so the
// narrowing flows through `pipe` (remeda technique). Thin wrapper over
// `Array.prototype.filter`.
export function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
): (array: readonly T[]) => S[];
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
): (array: readonly T[]) => T[];
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
): (array: readonly T[]) => T[] {
  return (array) => array.filter(predicate);
}
