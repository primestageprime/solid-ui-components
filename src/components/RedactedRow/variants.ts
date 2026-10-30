// ============================================
// RedactedRow Curried Variants — Depth 2 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import { createRedactedRow, type RedactedRowDataProps } from "./RedactedRow";

/** A locked row standing in for content the viewer may not see yet. */
export const LockedRow: Component<RedactedRowDataProps> = createRedactedRow();
