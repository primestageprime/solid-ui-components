// ============================================
// Chart scales — pure data → pixel mapping. No SolidJS, no DOM.
// ============================================

import { scaleTime as d3ScaleTime } from "d3-scale";

export interface Scale {
  (value: number): number;
  invert: (px: number) => number;
  domain: readonly [number, number];
  range: readonly [number, number];
  ticks: (count?: number) => number[];
}

export const linearScale = (
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale => {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const dSpan = d1 - d0 || 1;
  const rSpan = r1 - r0;
  const fn = ((v: number) => r0 + ((v - d0) / dSpan) * rSpan) as Scale;
  fn.invert = (px: number) => d0 + ((px - r0) / rSpan) * dSpan;
  fn.domain = domain;
  fn.range = range;
  fn.ticks = (count = 5) => {
    if (count <= 0) return [];
    const step = niceStep(dSpan / count);
    const start = Math.ceil(d0 / step) * step;
    const out: number[] = [];
    for (let v = start; v <= d1 + 1e-9; v += step) out.push(round(v));
    return out;
  };
  return fn;
};

const niceStep = (raw: number): number => {
  if (raw <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / exp;
  if (norm < 1.5) return 1 * exp;
  if (norm < 3) return 2 * exp;
  if (norm < 7) return 5 * exp;
  return 10 * exp;
};

const round = (v: number): number => {
  // Trim FP noise.
  return Math.abs(v) < 1e-12 ? 0 : Math.round(v * 1e9) / 1e9;
};

export const domainOf = <T>(
  data: readonly T[],
  accessor: (d: T) => number,
  pad: number = 0,
): [number, number] => {
  if (data.length === 0) return [0, 1];
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of data) {
    const v = accessor(d);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo === hi) {
    const eps = lo === 0 ? 1 : Math.abs(lo) * 0.1;
    return [lo - eps, hi + eps];
  }
  const span = hi - lo;
  return [lo - span * pad, hi + span * pad];
};

/** TimeScale extends Scale with a tickFormat helper for time-aware axis labels. */
export interface TimeScale extends Scale {
  /** Returns a formatter for tick values (epoch ms numbers). Defaults to d3's locale-aware format. */
  tickFormat: (count?: number, specifier?: string) => (v: number) => string;
}

/**
 * scaleTime — wraps d3-scale's scaleTime so the returned function matches our `Scale`
 * surface: takes a number (epoch ms), returns a pixel; `invert(px)` returns epoch ms;
 * `domain`/`range`/`ticks`/`tickFormat` are uniform. Domain endpoints are accepted as
 * `Date` instances and converted to epoch ms internally so downstream scale
 * consumers stay number-typed.
 */
export const scaleTime = (
  domain: readonly [Date, Date],
  range: readonly [number, number],
): TimeScale => {
  const d3 = d3ScaleTime()
    .domain([domain[0], domain[1]])
    .range([range[0], range[1]]);
  const d0 = domain[0].getTime();
  const d1 = domain[1].getTime();
  const fn = ((v: number) => d3(new Date(v))) as TimeScale;
  fn.invert = (px: number) => d3.invert(px).getTime();
  fn.domain = [d0, d1] as const;
  fn.range = [range[0], range[1]] as const;
  fn.ticks = (count = 5) => d3.ticks(count).map((t) => t.getTime());
  fn.tickFormat = (count = 5, specifier?: string) => {
    const f = d3.tickFormat(count, specifier as string | undefined);
    return (v: number) => f(new Date(v));
  };
  return fn;
};
