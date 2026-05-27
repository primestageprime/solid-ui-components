// ============================================
// Fab Curried Variants — Depth 2 (zero extra CSS)
// Pre-configured Fab via createFab() factory.
// ============================================
import { createFab } from "./Fab";
import type { FabDataProps } from "./Fab";
import type { Component } from "solid-js";

/**
 * AddFab — a Fab with the "plus" icon baked in.
 * Call site supplies only data + events:
 *   <AddFab label="Add item" onClick={handleAdd} />
 */
export const AddFab: Component<FabDataProps> = createFab({ icon: "plus" });
