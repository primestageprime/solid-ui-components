// fn — sum (Depth 0, pure). Total of a numeric array; `sum([]) === 0`. Plain
// loop, no callback — the named replacement for `xs.reduce((s, v) => s + v, 0)`.
export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
