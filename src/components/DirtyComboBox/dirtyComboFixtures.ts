/**
 * DirtyComboBox bench fixtures — sixteen payroll scenarios: enough that the
 * menu scrolls, and one name past the 30-character cap so the ellipsis and
 * the width clamp are both on show.
 */
import type { DirtyComboStore } from "./dirtyComboModel";

/** A scenario's saved config: a few annual salaries. */
export interface PayrollConfig {
  engineer: number;
  designer: number;
  manager: number;
}

export const LONG_NAME = "S-2026-09-24 aggressive hiring, two new pods";

export const PAYROLL_STORE: DirtyComboStore<PayrollConfig> = {
  items: [
    {
      id: "s1",
      label: "S-2026-09-24",
      saved: { engineer: 140000, designer: 120000, manager: 165000 },
    },
    {
      id: "s2",
      label: "Lean 2027",
      saved: { engineer: 130000, designer: 110000, manager: 150000 },
    },
    {
      id: "s3",
      label: "Hiring Push",
      saved: { engineer: 150000, designer: 125000, manager: 175000 },
    },
    {
      id: "s4",
      label: "Flat",
      saved: { engineer: 140000, designer: 120000, manager: 165000 },
    },
    {
      id: "s5",
      label: LONG_NAME,
      saved: { engineer: 160000, designer: 130000, manager: 185000 },
    },
    {
      id: "s6",
      label: "Contractor mix",
      saved: { engineer: 120000, designer: 100000, manager: 160000 },
    },
    // Past this point the menu is longer than its 280px cap, so it scrolls.
    {
      id: "s7",
      label: "Remote-first",
      saved: { engineer: 135000, designer: 115000, manager: 160000 },
    },
    {
      id: "s8",
      label: "Q4 freeze",
      saved: { engineer: 140000, designer: 120000, manager: 165000 },
    },
    {
      id: "s9",
      label: "Series B",
      saved: { engineer: 165000, designer: 135000, manager: 190000 },
    },
    {
      id: "s10",
      label: "Bridge round",
      saved: { engineer: 125000, designer: 105000, manager: 150000 },
    },
    {
      id: "s11",
      label: "EU office",
      saved: { engineer: 110000, designer: 95000, manager: 140000 },
    },
    {
      id: "s12",
      label: "Retention bonus",
      saved: { engineer: 148000, designer: 126000, manager: 172000 },
    },
    {
      id: "s13",
      label: "Merit +3%",
      saved: { engineer: 144200, designer: 123600, manager: 169950 },
    },
    {
      id: "s14",
      label: "Merit +5%",
      saved: { engineer: 147000, designer: 126000, manager: 173250 },
    },
    {
      id: "s15",
      label: "Downside case",
      saved: { engineer: 120000, designer: 100000, manager: 140000 },
    },
    {
      id: "s16",
      label: "Upside case",
      saved: { engineer: 170000, designer: 140000, manager: 195000 },
    },
  ],
  selectedId: "s1",
  draft: { engineer: 140000, designer: 120000, manager: 165000 },
};
