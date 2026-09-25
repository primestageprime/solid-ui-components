/**
 * OverflowNav's fold decision, printed as a table: container width × item
 * widths → how many stay inline and which fold into the kebab (G16).
 */
import { describe, expect, it } from "vitest";
import { join, map } from "../../fn";
import { type OverflowNavFoldInput, overflowNavVisibleCount } from "./fold";

const GAP = 8;
const KEBAB = 48;
// Thorcasting's three tabs, roughly: 401px of content with two 8px gaps.
const TABS = [120, 135, 130];

const row = (
  containerWidth: number,
  itemWidths: readonly number[],
  kebabForced = false,
): string => {
  const input: OverflowNavFoldInput = {
    containerWidth,
    itemWidths,
    gapPx: GAP,
    kebabReservePx: KEBAB,
    kebabForced,
  };
  const count = overflowNavVisibleCount(input);
  const shown =
    count === null
      ? "no layout — keep"
      : `${count} inline, ${itemWidths.length - count} folded`;
  return join("  ", [
    String(containerWidth).padStart(5),
    join(",", map(String, itemWidths)).padEnd(14),
    (kebabForced ? "forced" : "-").padEnd(6),
    shown,
  ]);
};

describe("overflowNavVisibleCount", () => {
  it("prints the fold table", () => {
    const table = join("\n", [
      "width  items           kebab   decision",
      row(1440, TABS),
      row(401, TABS),
      row(400, TABS),
      row(800, TABS),
      row(223, TABS),
      row(390, TABS),
      row(120, TABS),
      row(47, TABS),
      row(0, TABS),
      row(401, TABS, true),
      row(449, TABS, true),
      row(0, [0, 0, 0]),
      row(390, [0, 0, 0]),
      row(390, []),
    ]);
    expect(table).toMatchInlineSnapshot(`
      "width  items           kebab   decision
       1440  120,135,130     -       3 inline, 0 folded
        401  120,135,130     -       3 inline, 0 folded
        400  120,135,130     -       2 inline, 1 folded
        800  120,135,130     -       3 inline, 0 folded
        223  120,135,130     -       1 inline, 2 folded
        390  120,135,130     -       2 inline, 1 folded
        120  120,135,130     -       0 inline, 3 folded
         47  120,135,130     -       0 inline, 3 folded
          0  120,135,130     -       0 inline, 3 folded
        401  120,135,130     forced  2 inline, 1 folded
        449  120,135,130     forced  3 inline, 0 folded
          0  0,0,0           -       no layout — keep
        390  0,0,0           -       no layout — keep
        390                  -       0 inline, 0 folded"
    `);
  });
});
