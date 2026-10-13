// Real rows from primestage, local STDB, 2026-10-13 — as the mockup carried them.
import { type Payee, type Why, mkRows, pairs } from "./model";

const plain = (text: string): Why => [{ text }];

const asa: Payee = {
  key: "asa",
  name: "A Step Ahead Strategies",
  meta: "SaaS Expense · AMEX Business CC",
  tag0: "mixed",
  configs: [
    {
      id: "fix", amt: 39700, dom: 16, grace: 0, from: "2025-10-16", halt: null, label: "Fixed Monthly", when: "on the 16th",
      rows: mkRows(["2025-10-16", "2025-11-16", "2025-12-16", "2026-01-16", "2026-02-16", "2026-03-16", "2026-04-16", "2026-05-16", "2026-06-16", "2026-07-16", "2026-08-16", "2026-09-16"], 39700),
    },
  ],
  uncovered: pairs([["2025-11-12", 1052], ["2025-11-14", 1876], ["2025-12-20", 2629], ["2026-01-30", 1544], ["2026-03-14", 1000]]),
  autos: [
    {
      id: "var", label: "Auto · variable $0 – $26.29/mo, halted 2026-03-14",
      mk: () => ({ id: "var", variable: true, lo: 0, hi: 2629, grace: 0, from: "2025-11-12", halt: "2026-03-14", label: "Variable", when: "halted 2026-03-14", rows: asa.uncovered }),
    },
  ],
  yMax: 110, yMin: -60, unit: 1,
  why: (u) => [
    { text: `the ${u.length} uncovered charges are at most ` }, { text: "43 days", strong: true }, { text: " apart and the last was " }, { text: "213 days", strong: true },
    { text: " ago, more than twice that gap. They look like a start-up set of charges, not an ongoing cost." },
  ],
  recommend: "discard",
};

const anthem: Payee = {
  key: "anthem",
  name: "Anthem Blue Cross",
  meta: "Health Insurance · Columbia Bank",
  tag0: "auto",
  configs: [
    { id: "l3", amt: 380600, dom: 18, grace: 2, from: "2026-07-01", halt: null, label: "Fixed Monthly", when: "around the 18th, ±2 days", rows: mkRows(["2026-07-20", "2026-08-17", "2026-09-21"], 380600) },
  ],
  uncovered: pairs([["2025-10-20", 400958], ["2025-11-17", 400958], ["2025-12-15", 400958], ["2026-01-19", 271278], ["2026-02-16", 336118], ["2026-03-16", 336118], ["2026-04-20", 336118], ["2026-05-18", 336118], ["2026-06-15", 336118]]),
  autos: [
    { id: "l1", label: "Auto · $4,009.58 Oct – Dec 2025 (3)", mk: () => ({ id: "l1", amt: 400958, dom: 18, grace: 2, from: "2025-10-01", halt: "2025-12-31", label: "Fixed Monthly", when: "Oct – Dec 2025, halted", rows: mkRows(["2025-10-20", "2025-11-17", "2025-12-15"], 400958) }) },
    { id: "l2", label: "Auto · $3,361.18 Feb – Jun 2026 (5)", mk: () => ({ id: "l2", amt: 336118, dom: 18, grace: 2, from: "2026-02-01", halt: "2026-06-30", label: "Fixed Monthly", when: "Feb – Jun 2026, halted", rows: mkRows(["2026-02-16", "2026-03-16", "2026-04-20", "2026-05-18", "2026-06-15"], 336118) }) },
  ],
  yMax: 40000, yMin: -8000, unit: 1000,
  why: (u) => plain(`the ${u.length} uncovered payments all come before the current level began and sit in earlier levels that do not overlap it. Lock-stepped levels like this are history, not a cost to model.`),
  recommend: "discard",
};

const anthropic: Payee = {
  key: "anthropic",
  name: "Anthropic - AI",
  meta: "Software · AMEX Business CC",
  tag0: "mixed",
  configs: [
    {
      id: "q2", amt: 20000, qty: 2, dom: 20, grace: 1, from: "2026-01-20", halt: null, label: "Fixed Monthly", when: "around the 20th, ±1 day",
      rows: mkRows(["2026-01-20", "2026-01-21", "2026-02-20", "2026-02-21", "2026-03-20", "2026-03-21", "2026-04-20", "2026-04-21", "2026-05-20", "2026-05-21", "2026-06-20", "2026-06-21", "2026-07-20", "2026-07-21", "2026-08-20", "2026-08-21", "2026-09-20", "2026-09-21"], 20000),
    },
  ],
  uncovered: pairs([["2026-01-12", 500], ["2026-01-12", 2500], ["2026-01-13", 5000], ["2026-01-15", 5209], ["2026-01-16", 4529], ["2026-01-20", 4549], ["2026-04-07", 10027]]),
  autos: [
    { id: "var", label: "Auto · variable $0 – $100.27/mo, halted 2026-04-07", mk: () => ({ id: "var", variable: true, lo: 0, hi: 10027, grace: 0, from: "2026-01-12", halt: "2026-04-07", label: "Variable", when: "halted 2026-04-07", rows: anthropic.uncovered }) },
  ],
  yMax: 420, yMin: -90, unit: 1, ticks: [400, 300, 200, 100, 0],
  why: (u) => [
    { text: `the ${u.length} uncovered charges are pay-as-you-go top-ups at most ` }, { text: "77 days", strong: true }, { text: " apart and the last was " }, { text: "170 days", strong: true },
    { text: " ago, more than twice that gap. The two $200 charges a month cover usage since." },
  ],
  recommend: "discard",
};

const regus: Payee = {
  key: "regus",
  name: "Regus",
  meta: "Rent Expense · AMEX Business CC",
  tag0: "auto",
  configs: [
    {
      id: "rent", amt: 166849, tol: 0.05, dom: 5, grace: 5, from: "2025-10-05", halt: null, label: "Fixed Monthly", when: "around the 5th, ±5 days",
      rows: pairs([["2025-10-05", 166486], ["2025-11-05", 166486], ["2025-12-15", 173885], ["2026-01-14", 166849], ["2026-02-15", 166849], ["2026-03-05", 166849], ["2026-04-05", 168175], ["2026-05-05", 172261], ["2026-06-05", 166849], ["2026-07-05", 166849], ["2026-08-05", 166849], ["2026-09-05", 166849]]),
    },
  ],
  uncovered: [],
  autos: [],
  yMax: 160, yMin: -40, unit: 1, ticks: [150, 100, 50, 0],
  why: () => [],
  recommend: "none",
};

const farmers: Payee = {
  key: "farmers",
  name: "Farmers Insurance",
  meta: "Insurance · Columbia Bank",
  tag0: "mixed",
  configs: [
    {
      id: "var", variable: true, lo: 0, hi: 1655, med: 463, from: "2025-10-13", halt: null, every: 14, grace: 3, label: "Variable", when: "every 2 weeks, Mondays ±3 days",
      rows: pairs([["2025-10-13", 1304], ["2025-12-03", 1655], ["2025-12-22", 534], ["2026-02-02", 1245], ["2026-02-16", 415], ["2026-03-02", 415], ["2026-03-16", 1034], ["2026-04-06", 1034], ["2026-04-13", 463], ["2026-04-27", 463], ["2026-06-08", 924], ["2026-06-22", 463], ["2026-06-29", 385], ["2026-07-06", 463], ["2026-07-20", 463], ["2026-08-03", 461], ["2026-08-17", 463], ["2026-08-31", 1402], ["2026-09-14", 601]]),
    },
  ],
  uncovered: [{ d: "2026-08-24", c: 25000 }],
  autos: [
    { id: "annual", label: "Large cadence · $250.00 every 1 year on Aug 24", mk: () => ({ id: "annual", amt: 25000, dom: 24, grace: 3, from: "2026-08-24", halt: null, label: "Annual", when: "around Aug 24", rows: [{ d: "2026-08-24", c: 25000 }] }) },
  ],
  yMax: 30, yMin: -10, unit: 1, ticks: [30, 20, 10, 0, -10],
  why: () => [
    { text: "one payment of " }, { text: "$250.00", strong: true },
    { text: " is 15× the band. A single occurrence gives no cadence, so pick: it was a one-off, or it comes back every year on Aug 24." },
  ],
  recommend: "none",
};

export const PAYEES: readonly Payee[] = [asa, anthem, anthropic, regus, farmers];
export const payeeOf = (key: string): Payee => PAYEES.find((p) => p.key === key)!;

/** The group list, with the payees that have data marked. */
export const GROUPS: readonly { readonly name: string; readonly tag: string; readonly key?: string }[] = [
  { name: "A Step Ahea…", tag: "mixed", key: "asa" },
  { name: "Amazon.com", tag: "halted" },
  { name: "AMEX Busin…", tag: "halted" },
  { name: "Anthem Blue…", tag: "auto", key: "anthem" },
  { name: "Anthropic - AI", tag: "mixed", key: "anthropic" },
  { name: "Apple", tag: "halted" },
  { name: "Cal Savers", tag: "auto" },
  { name: "Canva", tag: "halted" },
  { name: "Chase", tag: "halted" },
  { name: "Cursor", tag: "halted" },
  { name: "Digital Ocean", tag: "auto" },
  { name: "Discord", tag: "auto" },
  { name: "Farmers Insur…", tag: "mixed", key: "farmers" },
  { name: "Figma", tag: "auto" },
  { name: "Github", tag: "mixed" },
  { name: "Google", tag: "auto" },
  { name: "Humana", tag: "auto" },
  { name: "Regus", tag: "auto", key: "regus" },
  { name: "Remarkable", tag: "auto" },
  { name: "Twilio", tag: "mixed" },
];
