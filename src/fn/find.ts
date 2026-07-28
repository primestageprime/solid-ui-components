// fn — find (Depth 0, pure). Dual form (ruled 2026-07-18): curried data-last
// `find(pred)` returns a function over a readonly array (for `pipe`); direct
// `find(pred, array)` applies immediately (preferred over `array.find(pred)`
// outside a pipe). 2-ary dispatch on `arguments.length` — not full auto-curry.
//
// Returns `undefined` when nothing matches — including on empty input. That is
// the native contract, kept deliberately: a caller that must distinguish "no
// match" from "matched an undefined element" should not be storing `undefined`
// in the array. Carries the type-guard overload, so a `(v) => v is S` predicate
// narrows the result to `S | undefined` in both forms.
export function find<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
): (array: readonly T[]) => S | undefined;
export function find<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  array: readonly T[],
): S | undefined;
export function find<T>(
  predicate: (value: T, index: number) => boolean,
): (array: readonly T[]) => T | undefined;
export function find<T>(
  predicate: (value: T, index: number) => boolean,
  array: readonly T[],
): T | undefined;
export function find<T>(
  predicate: (value: T, index: number) => boolean,
  array?: readonly T[],
): T | undefined | ((array: readonly T[]) => T | undefined) {
  const run = (arr: readonly T[]): T | undefined => arr.find(predicate);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
