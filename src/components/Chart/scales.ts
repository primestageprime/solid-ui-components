// ============================================
// Chart scales — pure data → pixel mapping. No SolidJS, no DOM.
// ============================================

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
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
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
