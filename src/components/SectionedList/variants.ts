// Curried variants of the SectionedList primitive.
import type { Component } from "solid-js";
import {
  type SectionedListDataProps,
  createSectionedList,
} from "./SectionedList";

/** The status shape plus its word ("● done"). */
export const SectionedList: Component<SectionedListDataProps> =
  createSectionedList({ statusLabels: true });

/** The status shape only; the word is a screen-reader label. For a pane under ~200px. */
export const CompactSectionedList: Component<SectionedListDataProps> =
  createSectionedList({ statusLabels: false });
