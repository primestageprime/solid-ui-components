import { findIndex } from "../../fn";

/** Position of an id in an order, -1 when absent. */
export const indexOfId = (order: readonly string[], id: string): number =>
  findIndex((x: string) => x === id, order);
