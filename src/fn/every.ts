// fn — every (Depth 0, pure). Dual form (ruled 2026-07-18): curried data-last
// `every(pred)` returns a function over a readonly array (for `pipe`); direct
// `every(pred, array)` applies immediately (preferred over `array.every(pred)`
// outside a pipe). 2-ary dispatch on `arguments.length` — not full auto-curry.
//
// `every([], pred)` is `true` — the native contract (a universal claim over
// nothing is vacuously met). Short-circuits on the first mismatch, like the
// method it wraps, so an expensive predicate is not run past the answer.
export function every<T>(
  predicate: (value: T, index: number) => boolean,
): (array: readonly T[]) => boolean;
export function every<T>(
  predicate: (value: T, index: number) => boolean,
  array: readonly T[],
): boolean;
export function every<T>(
  predicate: (value: T, index: number) => boolean,
  array?: readonly T[],
): boolean | ((array: readonly T[]) => boolean) {
  const run = (arr: readonly T[]): boolean => arr.every(predicate);
  return arguments.length >= 2 ? run(array as readonly T[]) : run;
}
