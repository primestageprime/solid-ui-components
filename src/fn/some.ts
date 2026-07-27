// fn — some (Depth 0, pure). Dual form (ruled 2026-07-18): curried data-last
// `some(pred)` returns a function over a readonly array (for `pipe`); direct
// `some(pred, array)` applies immediately (preferred over `array.some(pred)`
// outside a pipe). 2-ary dispatch on `arguments.length` — not full auto-curry.
//
// `some([], pred)` is `false` — the native contract (an existential claim over
// nothing is unmet). Short-circuits on the first match, like the method it
// wraps, so an expensive predicate is not run past the answer.
export function some<T>(
  predicate: (value: T, index: number) => boolean,
): (array: readonly T[]) => boolean;
export function some<T>(
  predicate: (value: T, index: number) => boolean,
  array: readonly T[],
): boolean;
export function some<T>(
  predicate: (value: T, index: number) => boolean,
  array?: readonly T[],
): boolean | ((array: readonly T[]) => boolean) {
  const run = (arr: readonly T[]): boolean => arr.some(predicate);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
