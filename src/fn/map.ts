// fn — map (Depth 0, pure). Data-last: `map(fn)` returns a function over a
// readonly array. Thin wrapper over `Array.prototype.map` — the composition
// primitive that feeds projections into `sum`/`join`/`sortBy` inside `pipe`.
export function map<T, U>(
  fn: (value: T, index: number) => U,
): (array: readonly T[]) => U[] {
  return (array) => array.map(fn);
}
