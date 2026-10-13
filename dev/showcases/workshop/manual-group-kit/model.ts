// The Manual step's model, ported from the thorcasting mockup as pure
// functions. A config is a fixed amount on a day of month with a grace
// window, or a variable band on a cadence; a payee's rows are either claimed
// by a config or uncovered. Money is integer cents; dates are ISO strings.

export const TODAY = "2026-10-13";
export const LAST = "2026-09-24";

export interface Payment {
  readonly d: string;
  readonly c: number;
}

export interface Config {
  readonly id: string;
  readonly label: string;
  readonly when: string;
  readonly from: string;
  readonly halt: string | null;
  readonly grace: number;
  readonly rows: readonly Payment[];
  readonly variable?: boolean;
  readonly lo?: number;
  readonly hi?: number;
  readonly med?: number;
  readonly every?: number;
  readonly amt?: number;
  readonly qty?: number;
  readonly dom?: number;
  readonly tol?: number;
}

export interface AutoProposal {
  readonly id: string;
  readonly label: string;
  readonly mk: () => Config;
}

/** A sentence with the figures that carry it marked strong. */
export type Why = readonly { readonly text: string; readonly strong?: boolean }[];

export interface Payee {
  readonly key: string;
  readonly name: string;
  readonly meta: string;
  readonly tag0: string;
  readonly configs: readonly Config[];
  readonly uncovered: readonly Payment[];
  readonly autos: readonly AutoProposal[];
  readonly yMax: number;
  readonly yMin: number;
  readonly unit: 1 | 1000;
  readonly ticks?: readonly number[];
  readonly why: (u: readonly Payment[]) => Why;
  readonly recommend: "discard" | "none";
}

/** The expected amount per config id, where an edit has moved it. */
export type Expected = Readonly<Record<string, number>>;

export const money = (c: number): string =>
  `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const signed = (c: number): string => `${c >= 0 ? "+" : "−"}${money(Math.abs(c))}`;

export const day = (s: string): number => Math.round(new Date(`${s}T00:00:00Z`).getTime() / 864e5);
export const isoOf = (n: number): string => new Date(n * 864e5).toISOString().slice(0, 10);
export const ms = (s: string): number => new Date(`${s}T00:00:00Z`).getTime();
export const dayMs = (n: number): number => n * 864e5;

export const rowKey = (r: Payment): string => `${r.d}:${r.c}`;
export const mkRows = (dates: readonly string[], c: number): Payment[] => dates.map((d) => ({ d, c }));
export const pairs = (xs: readonly (readonly [string, number])[]): Payment[] => xs.map(([d, c]) => ({ d, c }));

export const expOf = (c: Config, exp: Expected): number => exp[c.id] ?? (c.variable ? c.med : c.amt) ?? 0;

export interface Slot {
  readonly g: number;
  readonly lo: number;
  readonly hi: number;
}

/** Expected slots up to the last data: monthly on the day of month, or every N days. */
export const slotsOf = (c: Config): Slot[] => {
  const until = Math.min(day(c.halt ?? TODAY), day(LAST));
  const out: Slot[] = [];
  if (c.variable && c.every) {
    for (let g = day(c.from); g <= until; g += c.every) out.push({ g, lo: g - c.grace, hi: g + c.grace });
  } else if (!c.variable) {
    const d0 = new Date(`${c.from}T00:00:00Z`);
    for (let m = 0; m < 24; m++) {
      const g = Math.round(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + m, c.dom ?? 1) / 864e5);
      if (g + c.grace > until) break;
      if (g + c.grace < day(c.from)) continue;
      out.push({ g, lo: g - c.grace, hi: g + c.grace });
    }
  }
  return out;
};

/** The expected amount that makes the running deviation end at zero. */
export const fitOf = (c: Config): number => {
  const tot = c.rows.reduce((a, r) => a + r.c, 0);
  const n = c.variable ? slotsOf(c).length : c.rows.length;
  return n ? Math.round(tot / n) : 0;
};

export const dev = (c: Config, r: Payment, exp: Expected): number => (c.tol ? r.c - expOf(c, exp) : 0);
export const inBand = (c: Config, r: Payment, exp: Expected): boolean =>
  !c.tol || Math.abs(dev(c, r, exp)) <= c.tol * expOf(c, exp);
export const inWindow = (c: Config, d: string): boolean =>
  Math.abs(new Date(`${d}T00:00:00Z`).getUTCDate() - (c.dom ?? 1)) <= c.grace;
export const windowStart = (c: Config, d: string): string => {
  const dt = new Date(`${d}T00:00:00Z`);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), (c.dom ?? 1) - c.grace)).toISOString().slice(0, 10);
};

export interface XY {
  readonly x: number;
  readonly y: number;
}

export interface SlotMark extends Slot {
  readonly hits: number;
  readonly qty: number;
  readonly state: "filled" | "partial" | "empty";
  readonly caption: string | undefined;
}

export interface DotMark {
  readonly row: Payment;
  readonly inSlot: boolean;
  readonly okAmt: boolean;
  readonly dv: number;
  readonly timing: "early" | "late" | null;
  readonly amount: "over" | "under" | null;
}

export interface ConfigSeries {
  readonly slots: readonly SlotMark[];
  readonly dots: readonly DotMark[];
  readonly line: readonly XY[];
  readonly end: XY;
  readonly drift: number;
}

/** Every mark a config draws: its slots, its arrivals and its running deviation. */
export const configSeries = (c: Config, exp: Expected): ConfigSeries => {
  const expected = expOf(c, exp);
  const qty = c.qty ?? 1;
  const used = new Set<number>();
  const ev: [number, number][] = [];
  const slots: SlotMark[] = slotsOf(c).map((sl) => {
    const hit = c.rows
      .map((r, i) => [r, i] as const)
      .filter(([r, i]) => !used.has(i) && day(r.d) >= sl.lo && day(r.d) <= sl.hi)
      .slice(0, c.variable ? 99 : qty);
    for (const [, i] of hit) used.add(i);
    if (c.variable) {
      if (hit.length) ev.push([Math.max(...hit.map(([r]) => day(r.d))), hit.reduce((a, [r]) => a + r.c, 0) - expected]);
      else ev.push([sl.hi, -expected]);
    } else {
      for (const [r] of hit) ev.push([day(r.d), r.c - expected]);
      for (let k = hit.length; k < qty; k++) ev.push([sl.hi, -expected]);
    }
    const full = c.variable ? hit.length > 0 : hit.length === qty;
    return {
      ...sl,
      hits: hit.length,
      qty,
      state: hit.length === 0 ? "empty" : full ? "filled" : "partial",
      caption: qty > 1 ? (full ? `×${hit.length}` : `${hit.length} of ${qty}`) : undefined,
    };
  });
  const dots: DotMark[] = c.rows.map((r, i) => {
    const inSlot = used.has(i);
    const okAmt = c.variable ? r.c <= (c.hi ?? 0) : inBand(c, r, exp);
    const dv = c.variable ? 0 : r.c - expected;
    if (!inSlot) ev.push([day(r.d), r.c]);
    const early = slots.some((sl) => day(r.d) < sl.lo && day(r.d) > sl.lo - 20);
    return {
      row: r,
      inSlot,
      okAmt,
      dv,
      timing: !inSlot && !c.variable ? (early ? "early" : "late") : null,
      amount: !okAmt && !c.variable ? (dv > 0 ? "over" : "under") : null,
    };
  });
  ev.sort((a, b) => a[0] - b[0]);
  const end = c.halt ?? TODAY;
  let acc = 0;
  const line: XY[] = [{ x: ms(c.from), y: 0 }];
  for (const [d, delta] of ev) {
    acc += delta;
    line.push({ x: dayMs(d), y: acc / 100 });
  }
  line.push({ x: ms(end), y: acc / 100 });
  return { slots, dots, line, end: { x: ms(end), y: acc / 100 }, drift: acc };
};

export interface UncoveredSeries {
  readonly line: readonly XY[];
  readonly dots: readonly { readonly row: Payment; readonly acc: number }[];
  readonly end: XY;
  readonly total: number;
}

export const uncoveredSeries = (p: Payee, unc: readonly Payment[]): UncoveredSeries => {
  const first = p.uncovered[0] && p.uncovered[0].d < p.configs[0]!.from ? p.uncovered[0].d : p.configs[0]!.from;
  let acc = 0;
  const line: XY[] = [{ x: ms(first), y: 0 }];
  const dots = unc.map((r) => {
    acc += r.c;
    line.push({ x: ms(r.d), y: acc / 100 });
    return { row: r, acc };
  });
  line.push({ x: ms(TODAY), y: acc / 100 });
  return { line, dots, end: { x: ms(TODAY), y: acc / 100 }, total: acc };
};

export const activeConfigs = (p: Payee, applied: readonly string[]): Config[] => [
  ...p.configs,
  ...applied.map((id) => p.autos.find((a) => a.id === id)!.mk()),
];
export const coveredKeys = (configs: readonly Config[]): Set<string> =>
  new Set(configs.flatMap((c) => c.rows.map(rowKey)));
export const uncoveredNow = (p: Payee, configs: readonly Config[]): Payment[] => {
  const covered = coveredKeys(configs);
  return p.uncovered.filter((r) => !covered.has(rowKey(r)));
};

/** The headline of a config card. */
export const headline = (c: Config, exp: Expected): string => {
  if (c.variable) {
    const mid = c.med != null ? `, expects ${money(expOf(c, exp))} a slot,` : c.halt ? " a month," : ",";
    return `Variable $0 – ${money(c.hi ?? 0)}${mid} ${c.when}`;
  }
  return `${c.label} ${c.qty ? `${c.qty} × ` : ""}${money(expOf(c, exp))}${c.tol ? ` ±${Math.round(c.tol * 100)}%` : ""} ${c.when}`;
};

export interface Summary {
  readonly text: string;
  readonly verdict: string;
}

/** The sub line of a config card and its verdict word. */
export const summary = (c: Config, exp: Expected): Summary => {
  const late = c.rows.filter((r) => !c.variable && !inWindow(c, r.d)).length;
  const lateText = late ? `, ${late} outside the ±${c.grace}-day window` : "";
  if (c.halt) return { text: `Covers ${c.rows.length} payments. Halted, so the forecast adds nothing for it.`, verdict: "On target" };
  if (c.variable) {
    const ds = c.rows.map((r) => day(r.d));
    const gaps = ds.slice(1).map((d, i) => d - ds[i]!);
    const med = [...c.rows.map((r) => r.c)].sort((a, b) => a - b)[c.rows.length >> 1] ?? 0;
    const every = c.every;
    if (every) {
      const d1 = Math.min(day(c.halt ?? TODAY), day(LAST));
      let slots = 0;
      let hitN = 0;
      for (let g = day(c.from); g <= d1; g += every) {
        slots++;
        if (c.rows.some((r) => Math.abs(day(r.d) - g) <= c.grace)) hitN++;
      }
      const onGrid = c.rows.filter((r) => {
        for (let g = day(c.from); g <= d1; g += every) if (Math.abs(day(r.d) - g) <= c.grace) return true;
        return false;
      }).length;
      return {
        text: `${c.rows.length} payments inside the band, median ${money(med)}. ${onGrid} of ${c.rows.length} on the ${every}-day grid; ${slots - hitN} of ${slots} slots had no payment; the three longest gaps end in a 2–4× payment, so the running deviation never drifts far from zero.`,
        verdict: "Catch-ups, not misses",
      };
    }
    return {
      text: `${c.rows.length} payments inside the band, median ${money(med)}, ${Math.min(...gaps)}–${Math.max(...gaps)} days apart. Forecast uses the band's median per period.`,
      verdict: "On target",
    };
  }
  if (c.qty)
    return {
      text: `${c.rows.length} payments, ${c.qty} every month since ${c.from.slice(0, 7)}, all inside the amount band${lateText}.`,
      verdict: "On target",
    };
  if (c.tol) {
    const amt = expOf(c, exp);
    const off = c.rows.filter((r) => r.c !== amt);
    const out = c.rows.filter((r) => !inBand(c, r, exp));
    const mx = Math.max(...c.rows.map((r) => Math.abs(dev(c, r, exp))));
    const tot = c.rows.reduce((a, r) => a + (r.c - amt), 0);
    return {
      text: `${c.rows.length - out.length} of ${c.rows.length} payments inside the ±${Math.round(c.tol * 100)}% band, ${off.length} differ from the level by up to ${money(mx)}; running deviation ${signed(tot)} over ${c.rows.length} payments${late ? `; ${late} outside the ±${c.grace}-day window` : ""}.`,
      verdict: out.length ? "Check amount" : "On target",
    };
  }
  return { text: `${c.rows.length} of ${c.rows.length} payments inside the amount band${lateText}.`, verdict: "On target" };
};

export const editable = (c: Config): boolean => Boolean((c.variable && c.med != null) || c.tol);
export const driftTolerance = (c: Config): number => (c.variable ? 500 : 2000);
