import { describe, it, expect } from "vitest";
import { splitLatexSegments, hasSplittableOperators } from "./latexSegments";

const terms = (latex: string) =>
  splitLatexSegments(latex).filter((s) => s.kind === "term").map((s) => s.latex);
const ops = (latex: string) =>
  splitLatexSegments(latex).filter((s) => s.kind === "op").map((s) => s.latex);

describe("splitLatexSegments", () => {
  it("returns a single term when there is no top-level operator", () => {
    expect(splitLatexSegments("\\frac{a}{b}")).toEqual([
      { kind: "term", latex: "\\frac{a}{b}" },
    ]);
    expect(hasSplittableOperators("\\frac{a}{b}")).toBe(false);
  });

  it("splits at a top-level + and the trailing =", () => {
    const latex = "a + \\frac{b}{c} = d";
    expect(terms(latex)).toEqual(["a", "\\frac{b}{c}", "d"]);
    expect(ops(latex)).toEqual(["+", "="]);
    expect(hasSplittableOperators(latex)).toBe(true);
  });

  it("does NOT split a + that lives inside \\frac", () => {
    const latex = "\\frac{a + b}{c}";
    expect(terms(latex)).toEqual(["\\frac{a + b}{c}"]);
    expect(ops(latex)).toEqual([]);
  });

  it("does NOT split inside parentheses", () => {
    const latex = "(1 - CE) \\times 13.8 + x";
    expect(terms(latex)).toEqual(["(1 - CE) \\times 13.8", "x"]);
    expect(ops(latex)).toEqual(["+"]);
  });

  it("keeps \\times and subscripts intact within a term", () => {
    const latex = "\\frac{NOx \\times F_2 \\times 2760}{836200 \\times kW}";
    expect(terms(latex)).toEqual([latex]);
  });

  it("handles the real NOx compliance formula", () => {
    const latex =
      "(1 - \\var{ce}{CE}) \\times 13.8 + \\frac{\\var{nox}{NOx} \\times \\var{f2}{F_2} \\times 2760}{836200 \\times \\var{kw}{kW}} + \\frac{0.1029 \\times \\var{amps}{A}}{\\var{kw}{kW}} = \\var{result}{1.2345}";
    expect(ops(latex)).toEqual(["+", "+", "="]);
    expect(terms(latex)).toEqual([
      "(1 - \\var{ce}{CE}) \\times 13.8",
      "\\frac{\\var{nox}{NOx} \\times \\var{f2}{F_2} \\times 2760}{836200 \\times \\var{kw}{kW}}",
      "\\frac{0.1029 \\times \\var{amps}{A}}{\\var{kw}{kW}}",
      "\\var{result}{1.2345}",
    ]);
  });

  it("handles the real ROG compliance formula", () => {
    const latex =
      "(1 - \\var{ce}{CE}) \\times 0.52 + \\frac{\\var{thc}{THC} \\times \\var{f2}{F_2} \\times 821.76}{836200 \\times \\var{kw}{kW}} + \\frac{0.0137 \\times \\var{amps}{A}}{\\var{kw}{kW}} = \\var{result}{0.4242}";
    expect(ops(latex)).toEqual(["+", "+", "="]);
    expect(terms(latex).length).toBe(4);
  });

  it("treats a leading unary minus as part of the term, not a break", () => {
    expect(terms("-b + c")).toEqual(["-b", "c"]);
    expect(ops("-b + c")).toEqual(["+"]);
  });

  it("respects \\left \\right depth for grouping", () => {
    const latex = "\\left(a + b\\right) + c";
    expect(terms(latex)).toEqual(["\\left(a + b\\right)", "c"]);
    expect(ops(latex)).toEqual(["+"]);
  });

  it("does not treat an escaped brace as a depth change", () => {
    const latex = "\\{a\\} + b";
    expect(ops(latex)).toEqual(["+"]);
    expect(terms(latex)).toEqual(["\\{a\\}", "b"]);
  });
});
