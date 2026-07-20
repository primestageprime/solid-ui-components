// fn — flatMap (Depth 0, pure). Dual form (ruled 2026-07-18): curried
// data-last `flatMap(fn)` returns a function over a readonly array (for
// `pipe`); direct `flatMap(fn, array)` applies immediately (preferred over
// `array.flatMap(fn)` outside a pipe). 2-ary dispatch on `arguments.length` —
// not full auto-curry.
export function flatMap<T, U>(
  fn: (value: T, index: number) => readonly U[],
): (array: readonly T[]) => U[];
export function flatMap<T, U>(
  fn: (value: T, index: number) => readonly U[],
  array: readonly T[],
): U[];
export function flatMap<T, U>(
  fn: (value: T, index: number) => readonly U[],
  array?: readonly T[],
): U[] | ((array: readonly T[]) => U[]) {
  const run = (arr: readonly T[]): U[] => arr.flatMap(fn);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
