// Sample tree for the bench: an assembly made up of smaller parts, three
// levels deep, so the one-level and the any-depth questions both show.
import { map, sum } from "../../../../src/fn";

export interface Part {
  readonly id: string;
  readonly name: string;
  readonly qty: number;
  /** Unit cost for a leaf. A parent's cost is the sum of its children. */
  readonly unit?: number;
  readonly parts?: readonly Part[];
}

export const ASSEMBLIES: readonly Part[] = [
  {
    id: "pump",
    name: "Pump assembly",
    qty: 1,
    parts: [
      {
        id: "motor",
        name: "Motor",
        qty: 1,
        parts: [
          { id: "stator", name: "Stator", qty: 1, unit: 140 },
          { id: "rotor", name: "Rotor", qty: 1, unit: 95 },
          { id: "bearing", name: "Bearing", qty: 2, unit: 12.5 },
        ],
      },
      { id: "impeller", name: "Impeller", qty: 1, unit: 60 },
      { id: "housing", name: "Housing", qty: 1, unit: 88 },
      { id: "seal", name: "Shaft seal", qty: 2, unit: 7.25 },
    ],
  },
  {
    id: "valve",
    name: "Valve kit",
    qty: 3,
    parts: [
      { id: "body", name: "Valve body", qty: 1, unit: 22 },
      { id: "stem", name: "Stem", qty: 1, unit: 6 },
      { id: "gasket", name: "Gasket", qty: 4, unit: 0.8 },
    ],
  },
  { id: "hose", name: "Hose, 2 m", qty: 2, unit: 14 },
];

/** Cost of one unit: a leaf's own `unit`, or the sum of its parts. */
export const unitCost = (p: Part): number =>
  p.parts ? sum(map((c: Part) => c.qty * unitCost(c), p.parts)) : (p.unit ?? 0);

export const lineCost = (p: Part): number => p.qty * unitCost(p);

/** Number of leaf parts under a parent, for the summary line. */
export const leafCount = (p: Part): number =>
  p.parts ? sum(map(leafCount, p.parts)) : 1;
