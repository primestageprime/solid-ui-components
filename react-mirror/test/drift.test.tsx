// The drift test: every SUI variant the mirror carries, rendered by SUI's own
// Solid component and by the React mirror with the same props, must come out
// as the same tree (tags, classes, attributes, style, text).
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { renderSolid, solidBases, solidTables } from "solid-fixture";
import { describe, expect, it } from "vitest";
import * as buttons from "sui:Button/variants";
import * as dividers from "sui:Divider/variants";
import * as layout from "sui:Layout/variants";
import * as markedSliders from "sui:MarkedSlider/variants";
import * as surfaces from "sui:Surface/variants";
import * as texts from "sui:Text/variants";
import { Icon } from "../src/Icon.tsx";
import { MarkedSlider } from "../src/MarkedSlider.tsx";
import { GroupDial, MutationDial } from "../src/MutationDial.tsx";
import { SliderField } from "../src/SliderField.tsx";
import { BASE_FIXTURES } from "./fixtures.ts";
import { shape } from "./normalize.ts";

type Table = Readonly<Record<string, unknown>>;

const reactTables: Readonly<Record<string, Table>> = {
  Button: buttons,
  Layout: layout,
  Surface: surfaces,
  Text: texts,
  Divider: dividers,
  MarkedSlider: markedSliders,
};

const isComponent = (value: unknown): value is (props: object) => unknown =>
  typeof value === "function";

const componentNames = (table: Table): string[] =>
  Object.keys(table)
    .filter((name) => isComponent(table[name]))
    .sort();

export const renderReact = (
  component: unknown,
  props: Readonly<Record<string, unknown>>,
  children?: string,
): HTMLElement => {
  const host = document.createElement("div");
  flushSync(() => {
    createRoot(host).render(
      createElement(component as (p: object) => null, props, children),
    );
  });
  return host;
};

/** Props a variant needs to render at all (everything else renders bare). */
const REQUIRED: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  ContinuousMarkedSlider: {
    domain: [0, 200_000],
    range: [40_000, 90_000],
    prior: 44_000,
    value: 63_000,
    label: "Roofer",
  },
};

const NO_CHILDREN = new Set(["MarkedSlider", "Divider"]);

describe.each(Object.keys(reactTables))("%s variants", (table) => {
  const react = reactTables[table] ?? {};
  const solid = solidTables[table] ?? {};

  it("carries exactly SUI's variants", () => {
    expect(componentNames(react)).toEqual(componentNames(solid));
  });

  it.each(componentNames(react))("%s renders the same tree", (name) => {
    const props = REQUIRED[name] ?? {};
    const children = NO_CHILDREN.has(table) ? undefined : "x";
    expect(shape(renderReact(react[name], props, children))).toEqual(
      shape(renderSolid(solid[name], props, children)),
    );
  });
});

const reactBases: Readonly<Record<string, unknown>> = {
  MarkedSlider,
  Icon,
  SliderField,
  MutationDial,
  GroupDial,
};

describe.each(Object.keys(BASE_FIXTURES))("%s", (base) => {
  it.each(BASE_FIXTURES[base] ?? [])("$name renders the same tree", ({
    props,
    children,
  }) => {
    const solid = renderSolid(solidBases[base], props, children);
    expect(solid.childElementCount).toBe(1);
    expect(shape(renderReact(reactBases[base], props, children))).toEqual(
      shape(solid),
    );
  });
});
