// fn — join (Depth 0, pure). Data-last: `join(", ")` returns a function that
// joins an array into a string. Thin wrapper over `Array.prototype.join`
// (elements stringify with the same rules — `null`/`undefined` become "").
export function join(separator: string): (array: readonly unknown[]) => string {
  return (array) => array.join(separator);
}
