// ============================================
// DirtyComboBox Curried Variants — Depth 2 (zero CSS)
// One variant per REAL consumer. The call site passes data + callbacks only.
// ============================================
import type { Component } from "solid-js";
import {
  createDirtyComboBox,
  type DirtyComboBoxDataProps,
} from "./DirtyComboBox";

/** Thorcasting's payroll scenario strip: `[Baseline] vs [scenario ▾ │ ✓] ↺`. */
export const ScenarioComboBox: Component<DirtyComboBoxDataProps> =
  createDirtyComboBox({
    labels: {
      reference: "Baseline",
      versus: "vs",
      save: "Save",
      reset: "Reset to saved",
      deleteItem: (label) => `Delete ${label}`,
      create: "New scenario",
      choose: "Choose a scenario",
      none: "None",
    },
  });
