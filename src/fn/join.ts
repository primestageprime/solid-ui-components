// fn — join (Depth 0, pure). Dual form (ruled 2026-07-18): curried `join(sep)`
// for `pipe`, direct `join(sep, array)` for immediate use (preferred over
// `array.join(sep)`). Thin wrapper over `Array.prototype.join` (elements
// stringify with the same rules — `null`/`undefined` become ""). 2-ary dispatch
// on arguments.length.
export function join(separator: string): (array: readonly unknown[]) => string;
export function join(separator: string, array: readonly unknown[]): string;
export function join(
  separator: string,
  array?: readonly unknown[],
): string | ((array: readonly unknown[]) => string) {
  const run = (arr: readonly unknown[]): string => arr.join(separator);
  return arguments.length >= 2 ? run(array as readonly unknown[]) : run;
}
