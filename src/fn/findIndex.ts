// fn — findIndex (Depth 0, pure). Dual form (ruled 2026-07-18): curried
// data-last `findIndex(pred)` returns a function over a readonly array (for
// `pipe`); direct `findIndex(pred, array)` applies immediately (preferred over
// `array.findIndex(pred)` outside a pipe). 2-ary dispatch on `arguments.length`.
//
// Returns `-1` when nothing matches — the native sentinel, kept so the result
// stays a plain `number` usable as an index without unwrapping. Empty input is
// `-1`. No type-guard overload: the result is a position, not an element, so
// there is nothing to narrow.
export function findIndex<T>(
  predicate: (value: T, index: number) => boolean,
): (array: readonly T[]) => number;
export function findIndex<T>(
  predicate: (value: T, index: number) => boolean,
  array: readonly T[],
): number;
export function findIndex<T>(
  predicate: (value: T, index: number) => boolean,
  array?: readonly T[],
): number | ((array: readonly T[]) => number) {
  const run = (arr: readonly T[]): number => arr.findIndex(predicate);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
