/**
 * Contract Builder bench — example data: a house painter's 2026.
 *
 * PLANTED SIGNALS (each asserted in `contract-builder-model.test.ts`):
 *   - January interior is an UNPLANNED WIN: two winter interior jobs pay
 *     $18k against a $12.5k hope.
 *   - June exterior is BEHIND: $13k booked against a $20k hope.
 *   - Alvarez's DEPOSIT lands in April, a month before the work starts in May.
 *   - December exterior is hoped at zero (snow), yet Brook St's final payment
 *     lands there: an unplanned win against a zero projection.
 *   - Pemberton is NOT IN USE: its $10k in July must not count.
 *   - April furniture is an unplanned win: the church pews' second payment.
 */
import type { Config, Job, JobType } from "./contract-builder-model";

export const TYPES: readonly JobType[] = [
  {
    id: "O",
    name: "Exterior",
    typical: 4000,
    //    J  F  M  A  M  J  J  A  S  O  N  D
    qty: [0, 0, 2, 4, 5, 5, 5, 5, 4, 3, 2, 0],
  },
  {
    id: "I",
    name: "Interior",
    typical: 2500,
    qty: [5, 5, 3, 3, 2, 2, 2, 2, 3, 3, 4, 5],
  },
  {
    id: "F",
    name: "Furniture",
    typical: 1200,
    qty: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  },
];

export const JOBS: readonly Job[] = [
  {
    id: "okafor",
    name: "Okafor whole-house interior",
    type: "I",
    use: true,
    start: "2026-01-05",
    duration: 15,
    payments: [
      { label: "Deposit", on: "2026-01-05", amount: 6000 },
      { label: "Final", on: "2026-01-30", amount: 8000 },
    ],
  },
  {
    id: "lindqvist",
    name: "Lindqvist basement",
    type: "I",
    use: true,
    start: "2026-01-14",
    duration: 4,
    payments: [{ label: "On completion", on: "2026-01-20", amount: 4000 }],
  },
  {
    id: "dentist",
    name: "Dental office repaint",
    type: "I",
    use: true,
    start: "2026-02-09",
    duration: 8,
    payments: [{ label: "Net 10", on: "2026-02-20", amount: 9000 }],
  },
  {
    id: "lofts",
    name: "Mill Lofts unit 4",
    type: "I",
    use: true,
    start: "2026-09-14",
    duration: 3,
    payments: [{ label: "On completion", on: "2026-09-18", amount: 3000 }],
  },
  {
    id: "alvarez",
    name: "Alvarez colonial exterior",
    type: "O",
    use: true,
    start: "2026-05-04",
    duration: 18,
    payments: [
      { label: "Deposit", on: "2026-04-15", amount: 5000 },
      { label: "Prep + prime", on: "2026-05-15", amount: 8000 },
      { label: "Final", on: "2026-06-02", amount: 7000 },
    ],
  },
  {
    id: "marsh",
    name: "Marsh Rd cedar siding",
    type: "O",
    use: true,
    start: "2026-05-26",
    duration: 12,
    payments: [
      { label: "Deposit", on: "2026-05-20", amount: 3000 },
      { label: "Final", on: "2026-06-10", amount: 6000 },
    ],
  },
  {
    id: "hollis",
    name: "Hollis Ave fence + trim",
    type: "O",
    use: true,
    start: "2026-07-06",
    duration: 14,
    payments: [
      { label: "Half up front", on: "2026-07-06", amount: 9000 },
      { label: "Final", on: "2026-07-28", amount: 9000 },
    ],
  },
  {
    id: "pemberton",
    name: "Pemberton garage (not signed)",
    type: "O",
    use: false,
    start: "2026-07-13",
    duration: 5,
    payments: [{ label: "On completion", on: "2026-07-20", amount: 10000 }],
  },
  {
    id: "garner",
    name: "Garner barn",
    type: "O",
    use: true,
    start: "2026-08-03",
    duration: 20,
    payments: [{ label: "On completion", on: "2026-08-28", amount: 24000 }],
  },
  {
    id: "brook",
    name: "Brook St porch",
    type: "O",
    use: true,
    start: "2026-11-09",
    duration: 6,
    payments: [
      { label: "Deposit", on: "2026-10-20", amount: 2000 },
      { label: "Final", on: "2026-12-03", amount: 4500 },
    ],
  },
  {
    id: "reyes",
    name: "Reyes dresser refinish",
    type: "F",
    use: true,
    start: "2026-03-09",
    duration: 3,
    payments: [{ label: "On pickup", on: "2026-03-12", amount: 1200 }],
  },
  {
    id: "pews",
    name: "St. Anne's pews (12)",
    type: "F",
    use: true,
    start: "2026-03-23",
    duration: 15,
    payments: [
      { label: "Deposit", on: "2026-03-23", amount: 3000 },
      { label: "Final", on: "2026-04-10", amount: 4000 },
    ],
  },
];

export const CONFIG: Config = { types: TYPES, jobs: JOBS };
