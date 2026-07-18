import { describe, it, expect } from "vitest";
import { pipe } from "./pipe";
import { filter } from "./filter";
import { map } from "./map";
import { sum } from "./sum";

const inc = (n: number) => n + 1;
const double = (n: number) => n * 2;

describe("pipe", () => {
  it("returns the value unchanged with no functions", () => {
    expect(pipe(3)).toBe(3);
  });

  it("applies a single function", () => {
    expect(pipe(3, inc)).toBe(4);
  });

  it("threads left-to-right through many stages", () => {
    expect(pipe(3, inc, double, inc)).toBe(9); // ((3+1)*2)+1
  });

  it("changes type across stages", () => {
    const out = pipe(3, (n) => n.toString(), (s) => s.length);
    expect(out).toBe(1);
  });

  it("narrows a type guard through the pipe into later stages", () => {
    const mixed: (number | null)[] = [1, null, 2, null, 3];
    // filter's guard narrows to number[], so sum type-checks with no cast.
    const total: number = pipe(
      mixed,
      filter((v): v is number => v !== null),
      sum,
    );
    expect(total).toBe(6);
  });

  it("types and runs a full-length pipe (value + 11 stages)", () => {
    const out = pipe(
      0,
      inc, inc, inc, inc, inc, inc, inc, inc, inc, inc, inc,
    );
    expect(out).toBe(11);
  });

  it("catches a mismatched middle stage at compile time", () => {
    // @ts-expect-error stage 2 outputs number; stage 3 requires a string.
    pipe(3, (n: number) => n + 1, (s: string) => s.length);
  });

  it("composes array helpers", () => {
    const out = pipe(
      [1, 2, 3, 4],
      filter((n) => n % 2 === 0),
      map(double),
    );
    expect(out).toEqual([4, 8]);
  });
});
