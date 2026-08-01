// fn — lengthOf (Depth 0, pure). Dual form (ruled 2026-07-18): the length of a
// property — `lengthOf(key, obj) === length(prop(key, obj))`, the function-first
// replacement for `obj.key.length` (Peter flagged `hits.dotChains.length`).
// Curried `lengthOf(key)` for `pipe`, direct `lengthOf(key, obj)` for immediate
// use. Constrained so the property at `key` must itself have a `length`. 2-ary
// dispatch on arguments.length.
import { length } from "./length";
import { prop } from "./prop";

export function lengthOf<K extends PropertyKey>(
  key: K,
): (obj: { [P in K]: { readonly length: number } }) => number;
export function lengthOf<K extends PropertyKey>(
  key: K,
  obj: { [P in K]: { readonly length: number } },
): number;
export function lengthOf<K extends PropertyKey>(
  key: K,
  obj?: { [P in K]: { readonly length: number } },
): number | ((obj: { [P in K]: { readonly length: number } }) => number) {
  const run = (o: { [P in K]: { readonly length: number } }): number =>
    length(prop(key, o));
  return arguments.length >= 2
    ? run(obj as { [P in K]: { readonly length: number } })
    : run;
}
