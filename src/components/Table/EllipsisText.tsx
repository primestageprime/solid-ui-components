// Back-compat shim (Depth 2 — see DataDisplay/EllipsisText for the real
// component). EllipsisText was promoted to the container-agnostic
// DataDisplay/ primitive family (2026-07-23) — it renders equally in a table
// cell, a definition-list <dd>, or a card slot, so it no longer belongs under
// Table/. Existing deep importers (textCells, fields/list) keep working via
// this re-export; new code should import { EllipsisText } from the barrel.
export { EllipsisText, type EllipsisTextProps } from "../DataDisplay/EllipsisText";
