// fn — filter (Depth 0, pure). Dual form (ruled 2026-07-18): curried `filter(pred)`
// for `pipe`, direct `filter(pred, array)` for immediate use (preferred over
// `array.filter(pred)`). Both forms carry the type-guard overload: a predicate
// of the form `(v) => v is S` narrows the element type (through `pipe` in the
// curried form, in the return type directly). 2-ary dispatch on arguments.length.
export function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
): (array: readonly T[]) => S[];
export function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  array: readonly T[],
): S[];
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
): (array: readonly T[]) => T[];
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
  array: readonly T[],
): T[];
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
  array?: readonly T[],
): T[] | ((array: readonly T[]) => T[]) {
  const run = (arr: readonly T[]): T[] => arr.filter(predicate);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
