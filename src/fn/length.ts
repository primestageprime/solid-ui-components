// fn — length (Depth 0, pure). Unary: the `.length` of anything that has one —
// an array or a string (`{ length: number }`). The named replacement for
// `xs.length` in the contexts the function-first convention governs (ruled
// 2026-07-18). Compose with `prop` via `lengthOf`.
export function length(value: { readonly length: number }): number {
  return value.length;
}
