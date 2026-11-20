// The Solid side of the drift test: SUI's real components, rendered by Solid.
// Imported by the React-side test through the `solid-fixture` alias, so the
// two JSX dialects never meet in one file.
import type { Component } from "solid-js";
import { render } from "solid-js/web";
import * as buttons from "../../../src/components/Button/variants";
import { CountInput100 } from "../../../src/components/CurrencyInput/sized";
import * as dividers from "../../../src/components/Divider/variants";
import * as layout from "../../../src/components/Layout/variants";
import { Icon } from "../../../src/components/Icon/Icon";
import { MarkedSlider } from "../../../src/components/MarkedSlider/MarkedSlider";
import * as markedSliders from "../../../src/components/MarkedSlider/variants";
import { MutationDial } from "../../../src/components/MutationSliders/dial";
import { GroupDial } from "../../../src/components/MutationSliders/groupDial";
import { SliderField } from "../../../src/components/Slider/SliderField";
import * as surfaces from "../../../src/components/Surface/variants";
import * as texts from "../../../src/components/Text/variants";
import { WeightedGroupCard } from "../../../src/components/WeightedGroupCard/WeightedGroupCard";

type Table = Readonly<Record<string, unknown>>;

export const solidTables: Readonly<Record<string, Table>> = {
  Button: buttons,
  Layout: layout,
  Surface: surfaces,
  Text: texts,
  Divider: dividers,
  MarkedSlider: markedSliders,
};

export const solidBases: Readonly<Record<string, unknown>> = {
  CountInput100,
  Icon,
  MarkedSlider,
  SliderField,
  MutationDial,
  GroupDial,
  WeightedGroupCard,
};

/** Render `component` with `props` (and text children) into a fresh div. */
export const renderSolid = (
  component: unknown,
  props: Readonly<Record<string, unknown>>,
  children?: string,
): HTMLElement => {
  const host = document.createElement("div");
  const C = component as Component<Record<string, unknown>>;
  render(
    () =>
      children === undefined ? <C {...props} /> : <C {...props}>{children}</C>,
    host,
  );
  return host;
};
