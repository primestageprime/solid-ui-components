// fn — map (Depth 0, pure). Dual form (ruled 2026-07-18): curried data-last
// `map(fn)` returns a function over a readonly array (for `pipe`); direct
// `map(fn, array)` applies immediately (preferred over `array.map(fn)` outside
// a pipe). 2-ary dispatch on `arguments.length` — not full auto-curry.
export function map<T, U>(
  fn: (value: T, index: number) => U,
): (array: readonly T[]) => U[];
export function map<T, U>(
  fn: (value: T, index: number) => U,
  array: readonly T[],
): U[];
export function map<T, U>(
  fn: (value: T, index: number) => U,
  array?: readonly T[],
): U[] | ((array: readonly T[]) => U[]) {
  const run = (arr: readonly T[]): U[] => arr.map(fn);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
