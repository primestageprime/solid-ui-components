// Invented rows, shaped after one real company's payment patterns (dates kept,
// amounts scaled). No real payee, account, or amount appears here.
import { type Payee, type Why, mkRows, pairs } from "./model";

const plain = (text: string): Why => [{ text }];

const acorn: Payee = {
  key: "acorn",
  name: "Acorn Ridge Analytics",
  meta: "Subscriptions · Ambrook Business Card",
  tag0: "mixed",
  configs: [
    {
      id: "fix", amt: 47640, dom: 16, grace: 0, from: "2025-10-16", halt: null, label: "Fixed Monthly", when: "on the 16th",
      rows: mkRows(["2025-10-16", "2025-11-16", "2025-12-16", "2026-01-16", "2026-02-16", "2026-03-16", "2026-04-16", "2026-05-16", "2026-06-16", "2026-07-16", "2026-08-16", "2026-09-16"], 47640),
    },
  ],
  uncovered: pairs([["2025-11-12", 1262], ["2025-11-14", 2251], ["2025-12-20", 3155], ["2026-01-30", 1853], ["2026-03-14", 1200]]),
  autos: [
    {
      id: "var", label: "Auto · variable $0 – $31.55/mo, halted 2026-03-14",
      mk: () => ({ id: "var", variable: true, lo: 0, hi: 3155, grace: 0, from: "2025-11-12", halt: "2026-03-14", label: "Variable", when: "halted 2026-03-14", rows: acorn.uncovered }),
    },
  ],
  yMax: 132, yMin: -72, unit: 1,
  why: (u) => [
    { text: `the ${u.length} uncovered charges are at most ` }, { text: "43 days", strong: true }, { text: " apart and the last was " }, { text: "213 days", strong: true },
    { text: " ago, more than twice that gap. They look like a start-up set of charges, not an ongoing cost." },
  ],
  recommend: "discard",
};

const andover: Payee = {
  key: "andover",
  name: "Andover Health Plan",
  meta: "Employee Health · Bayfront Bank",
  tag0: "auto",
  configs: [
    { id: "l3", amt: 456720, dom: 18, grace: 2, from: "2026-07-01", halt: null, label: "Fixed Monthly", when: "around the 18th, ±2 days", rows: mkRows(["2026-07-20", "2026-08-17", "2026-09-21"], 456720) },
  ],
  uncovered: pairs([["2025-10-20", 481150], ["2025-11-17", 481150], ["2025-12-15", 481150], ["2026-01-19", 325534], ["2026-02-16", 403342], ["2026-03-16", 403342], ["2026-04-20", 403342], ["2026-05-18", 403342], ["2026-06-15", 403342]]),
  autos: [
    { id: "l1", label: "Auto · $4,811.50 Oct – Dec 2025 (3)", mk: () => ({ id: "l1", amt: 481150, dom: 18, grace: 2, from: "2025-10-01", halt: "2025-12-31", label: "Fixed Monthly", when: "Oct – Dec 2025, halted", rows: mkRows(["2025-10-20", "2025-11-17", "2025-12-15"], 481150) }) },
    { id: "l2", label: "Auto · $4,033.42 Feb – Jun 2026 (5)", mk: () => ({ id: "l2", amt: 403342, dom: 18, grace: 2, from: "2026-02-01", halt: "2026-06-30", label: "Fixed Monthly", when: "Feb – Jun 2026, halted", rows: mkRows(["2026-02-16", "2026-03-16", "2026-04-20", "2026-05-18", "2026-06-15"], 403342) }) },
  ],
  yMax: 48000, yMin: -9600, unit: 1000,
  why: (u) => plain(`the ${u.length} uncovered payments all come before the current level began and sit in earlier levels that do not overlap it. Lock-stepped levels like this are history, not a cost to model.`),
  recommend: "discard",
};

const anvil: Payee = {
  key: "anvil",
  name: "Anvilmind - AI",
  meta: "Software Tools · Ambrook Business Card",
  tag0: "mixed",
  configs: [
    {
      id: "q2", amt: 24000, qty: 2, dom: 20, grace: 1, from: "2026-01-20", halt: null, label: "Fixed Monthly", when: "around the 20th, ±1 day",
      rows: mkRows(["2026-01-20", "2026-01-21", "2026-02-20", "2026-02-21", "2026-03-20", "2026-03-21", "2026-04-20", "2026-04-21", "2026-05-20", "2026-05-21", "2026-06-20", "2026-06-21", "2026-07-20", "2026-07-21", "2026-08-20", "2026-08-21", "2026-09-20", "2026-09-21"], 24000),
    },
  ],
  uncovered: pairs([["2026-01-12", 600], ["2026-01-12", 3000], ["2026-01-13", 6000], ["2026-01-15", 6251], ["2026-01-16", 5435], ["2026-01-20", 5459], ["2026-04-07", 12032]]),
  autos: [
    { id: "var", label: "Auto · variable $0 – $120.32/mo, halted 2026-04-07", mk: () => ({ id: "var", variable: true, lo: 0, hi: 12032, grace: 0, from: "2026-01-12", halt: "2026-04-07", label: "Variable", when: "halted 2026-04-07", rows: anvil.uncovered }) },
  ],
  yMax: 504, yMin: -108, unit: 1, ticks: [400, 300, 200, 100, 0],
  why: (u) => [
    { text: `the ${u.length} uncovered charges are pay-as-you-go top-ups at most ` }, { text: "77 days", strong: true }, { text: " apart and the last was " }, { text: "170 days", strong: true },
    { text: " ago, more than twice that gap. The two $240 charges a month cover usage since." },
  ],
  recommend: "discard",
};

const ridgeway: Payee = {
  key: "ridgeway",
  name: "Ridgeway Desk",
  meta: "Office Lease · Ambrook Business Card",
  tag0: "auto",
  configs: [
    {
      id: "rent", amt: 200219, tol: 0.05, dom: 5, grace: 5, from: "2025-10-05", halt: null, label: "Fixed Monthly", when: "around the 5th, ±5 days",
      rows: pairs([["2025-10-05", 199783], ["2025-11-05", 199783], ["2025-12-15", 208662], ["2026-01-14", 200219], ["2026-02-15", 200219], ["2026-03-05", 200219], ["2026-04-05", 201810], ["2026-05-05", 206713], ["2026-06-05", 200219], ["2026-07-05", 200219], ["2026-08-05", 200219], ["2026-09-05", 200219]]),
    },
  ],
  uncovered: [],
  autos: [],
  yMax: 192, yMin: -48, unit: 1, ticks: [150, 100, 50, 0],
  why: () => [],
  recommend: "none",
};

const fairhaven: Payee = {
  key: "fairhaven",
  name: "Fairhaven Insurance",
  meta: "Business Insurance · Bayfront Bank",
  tag0: "mixed",
  configs: [
    {
      id: "var", variable: true, lo: 0, hi: 1986, med: 556, from: "2025-10-13", halt: null, every: 14, grace: 3, label: "Variable", when: "every 2 weeks, Mondays ±3 days",
      rows: pairs([["2025-10-13", 1565], ["2025-12-03", 1986], ["2025-12-22", 641], ["2026-02-02", 1494], ["2026-02-16", 498], ["2026-03-02", 498], ["2026-03-16", 1241], ["2026-04-06", 1241], ["2026-04-13", 556], ["2026-04-27", 556], ["2026-06-08", 1109], ["2026-06-22", 556], ["2026-06-29", 462], ["2026-07-06", 556], ["2026-07-20", 556], ["2026-08-03", 553], ["2026-08-17", 556], ["2026-08-31", 1682], ["2026-09-14", 721]]),
    },
  ],
  uncovered: [{ d: "2026-08-24", c: 30000 }],
  autos: [
    { id: "annual", label: "Large cadence · $300.00 every 1 year on Aug 24", mk: () => ({ id: "annual", amt: 30000, dom: 24, grace: 3, from: "2026-08-24", halt: null, label: "Annual", when: "around Aug 24", rows: [{ d: "2026-08-24", c: 30000 }] }) },
  ],
  yMax: 36, yMin: -12, unit: 1, ticks: [30, 20, 10, 0, -10],
  why: () => [
    { text: "one payment of " }, { text: "$300.00", strong: true },
    { text: " is 15× the band. A single occurrence gives no cadence, so pick: it was a one-off, or it comes back every year on Aug 24." },
  ],
  recommend: "none",
};

export const PAYEES: readonly Payee[] = [acorn, andover, anvil, ridgeway, fairhaven];
export const payeeOf = (key: string): Payee => PAYEES.find((p) => p.key === key)!;

/** The group list, with the payees that have data marked. */
export const GROUPS: readonly { readonly name: string; readonly tag: string; readonly key?: string }[] = [
  { name: "Acorn Ridge…", tag: "mixed", key: "acorn" },
  { name: "Alderway.com", tag: "halted" },
  { name: "Ambrook Bus…", tag: "halted" },
  { name: "Andover Hea…", tag: "auto", key: "andover" },
  { name: "Anvilmind - AI", tag: "mixed", key: "anvil" },
  { name: "Arbor Devices", tag: "halted" },
  { name: "Cabrillo Savings", tag: "auto" },
  { name: "Capstone Draw", tag: "halted" },
  { name: "Chesterfield Bank", tag: "halted" },
  { name: "Cypress Code", tag: "halted" },
  { name: "Deepwell Cloud", tag: "auto" },
  { name: "Dovetail Chat", tag: "auto" },
  { name: "Fairhaven I…", tag: "mixed", key: "fairhaven" },
  { name: "Fieldnote Design", tag: "auto" },
  { name: "Gantry Code", tag: "mixed" },
  { name: "Glimmer Suite", tag: "auto" },
  { name: "Harborview Health", tag: "auto" },
  { name: "Ridgeway Desk", tag: "auto", key: "ridgeway" },
  { name: "Rivulet Slate", tag: "auto" },
  { name: "Tidewire", tag: "mixed" },
];
