// fn — findLast (Depth 0, pure). Dual form (ruled 2026-07-18): curried
// data-last `findLast(pred)` returns a function over a readonly array (for
// `pipe`); direct `findLast(pred, array)` applies immediately (preferred over
// `array.findLast(pred)` outside a pipe). 2-ary dispatch on `arguments.length`.
//
// The nearest match scanning BACKWARD from the end — `find`'s mirror, and the
// reason it exists: `find(pred, [...xs].reverse())` both copies and reads
// backwards, and the reversing `.reverse()` link is exactly the dot-chain the
// house style forbids. Returns `undefined` when nothing matches. Carries the
// type-guard overload, narrowing to `S | undefined` in both forms.
export function findLast<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
): (array: readonly T[]) => S | undefined;
export function findLast<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  array: readonly T[],
): S | undefined;
export function findLast<T>(
  predicate: (value: T, index: number) => boolean,
): (array: readonly T[]) => T | undefined;
export function findLast<T>(
  predicate: (value: T, index: number) => boolean,
  array: readonly T[],
): T | undefined;
export function findLast<T>(
  predicate: (value: T, index: number) => boolean,
  array?: readonly T[],
): T | undefined | ((array: readonly T[]) => T | undefined) {
  const run = (arr: readonly T[]): T | undefined => arr.findLast(predicate);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
