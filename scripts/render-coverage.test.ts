// @vitest-environment node
//
// ============================================
// Render-coverage guard — the rules that make `componentsNeverRendered` mean
// something
// ============================================
//
// The metric this replaces (`foldersWithoutTests`) read 0 for its entire life
// because its rule was "some file in this folder contains `.test.`". Combobox
// satisfied that with a pure-function suite that imported one type from a
// 589-line component and mounted nothing, and a real defect lived behind the
// green. So the two halves of the replacement rule — a test must SEE the module
// AND MOUNT it — are what these tests pin. Weaken either half and the metric
// goes back to certifying coverage that does not exist:
//
//   drop "must mount"  → Combobox passes again (it imported the type)
//   drop "must see"    → Layout/Grid's tests vouch for Chart/Grid
//
// `analyse` is pure over a file map, so every case here is a handful of string
// literals. The earlier `health.mjs` guards spawned a subprocess per case and
// hung CI at fifteen minutes; nothing here touches the filesystem.
import { describe, it, expect } from "vitest";
import {
  analyse,
  componentExportsOf,
  isEntryPath,
  mountsAny,
  reexportsOf,
} from "./render-coverage.mjs";

/** Build the `{files, read}` pair `analyse` takes from a path→source map. */
const world = (files: Record<string, string>) => ({
  files: Object.keys(files),
  read: (p: string) => files[p] ?? "",
});

const BARREL = `export * from "./Widget";`;
const WIDGET = `export const Widget = () => <div />;`;

describe("analyse — the two halves of the rule", () => {
  it("counts a component mounted through its folder barrel as covered", () => {
    const { missing } = analyse(
      world({
        "/src/components/Widget/index.ts": BARREL,
        "/src/components/Widget/Widget.tsx": WIDGET,
        "/src/components/Widget/Widget.test.tsx": `
          import { Widget } from "./index";
          it("renders", () => render(() => <Widget />));
        `,
      }),
    );
    expect(missing).toEqual([]);
  });

  it("flags a component a test imports but never mounts (the Combobox shape)", () => {
    const { missing } = analyse(
      world({
        "/src/components/Widget/Widget.tsx": `
          export type WidgetProps = { on: boolean };
          export const Widget = (p: WidgetProps) => <div />;
        `,
        "/src/components/Widget/Widget.test.tsx": `
          import type { WidgetProps } from "./Widget";
          it("is a pure suite", () => expect(1).toBe(1));
        `,
      }),
    );
    expect(missing).toEqual(["/src/components/Widget/Widget.tsx"]);
  });

  it("does not let one component's test vouch for a namesake elsewhere (the Grid shape)", () => {
    const { missing } = analyse(
      world({
        "/src/components/Layout/Grid.tsx": `export const Grid = () => <div />;`,
        "/src/components/Chart/Grid.tsx": `export const Grid = () => <g />;`,
        "/src/components/Layout/Grid.test.tsx": `
          import { Grid } from "./Grid";
          it("renders", () => render(() => <Grid />));
        `,
      }),
    );
    expect(missing).toEqual(["/src/components/Chart/Grid.tsx"]);
  });
});

describe("analyse — reachability", () => {
  it("follows a barrel chain to a nested folder", () => {
    const { missing } = analyse(
      world({
        "/src/components/Table/index.ts": `export * from "./cells";`,
        "/src/components/Table/cells/index.ts": `export * from "./Cell";`,
        "/src/components/Table/cells/Cell.tsx": `export const Cell = () => <td />;`,
        "/src/components/Table/Table.test.tsx": `
          import { Cell } from "./index";
          it("renders", () => render(() => <Cell />));
        `,
      }),
    );
    expect(missing).toEqual([]);
  });

  it("terminates on a re-export cycle instead of recurring forever", () => {
    const { missing } = analyse(
      world({
        "/src/components/A/index.ts": `export * from "../B/index";`,
        "/src/components/B/index.ts": `export * from "../A/index";\nexport * from "./B";`,
        "/src/components/B/B.tsx": `export const B = () => <div />;`,
        "/src/components/B/B.test.tsx": `
          import { B } from "../A/index";
          it("renders", () => render(() => <B />));
        `,
      }),
    );
    expect(missing).toEqual([]);
  });

  it("ignores a bare-specifier import — a package cannot expose a local module", () => {
    const { missing } = analyse(
      world({
        "/src/components/Widget/Widget.tsx": WIDGET,
        "/src/components/Widget/Widget.test.tsx": `
          import { Widget } from "@primestageprime/solid-ui-components";
          it("renders", () => render(() => <Widget />));
        `,
      }),
    );
    expect(missing).toEqual(["/src/components/Widget/Widget.tsx"]);
  });
});

describe("analyse — what is not a component module", () => {
  it("skips a PascalCase .tsx that exports no component", () => {
    const { missing, skipped } = analyse(
      world({
        "/src/components/Combobox/ComboboxSingle.tsx": `
          export type SingleLocal = { a: 1 };
          export const renderSingle = () => <div />;
        `,
      }),
    );
    expect(skipped).toEqual(["/src/components/Combobox/ComboboxSingle.tsx"]);
    expect(missing).toEqual([]);
  });

  it("does not treat lowercase helpers or .ts modules as component modules", () => {
    expect(isEntryPath("/src/components/Chart/helpers.ts")).toBe(false);
    expect(isEntryPath("/src/components/Chart/variants.ts")).toBe(false);
    expect(isEntryPath("/src/components/Chart/Chart.test.tsx")).toBe(false);
    expect(isEntryPath("/src/internal/dom/ObserveSize.tsx")).toBe(false);
    expect(isEntryPath("/src/components/Chart/Chart.tsx")).toBe(true);
  });
});

describe("mountsAny", () => {
  it("ignores a tag that only appears in a comment", () => {
    const src = `
      // Usage: <Widget on /> renders the enabled form.
      /* also <Widget /> */
      it("is a pure suite", () => expect(1).toBe(1));
    `;
    expect(mountsAny(src, ["Widget"])).toBe(false);
  });

  it("counts a compound tag as mounting its namespace", () => {
    expect(mountsAny(`render(() => <Combobox.Item />)`, ["Combobox"])).toBe(
      true,
    );
  });

  it("does not match a longer name that starts with the same letters", () => {
    expect(mountsAny(`render(() => <WidgetPanel />)`, ["Widget"])).toBe(false);
  });

  // ── the generic-JSX blind spot, found 2026-08-04 ────────────────────────────
  // Solid components are generic functions, and a test that pins a row shape
  // writes the type argument out. The delimiter class omitted `<`, so every
  // such mount read as no mount at all. It cost two components — BucketQueue
  // (FIVE test files) and SplitQueueList — a place on the never-rendered list,
  // and both ranked at the top of the risk order, so the burn-down would have
  // sent someone to write tests that already existed.
  it("counts a mount carrying an explicit type argument", () => {
    expect(
      mountsAny(`render(() => <Queue<Item> items={x} />)`, ["Queue"]),
    ).toBe(true);
  });

  it("counts one whose type argument is an inline object shape", () => {
    // The real call site in BucketQueue.keyboard.test.tsx.
    const src = `render(() => <Queue<{ id: string; bucket: string }> items={x} />)`;
    expect(mountsAny(src, ["Queue"])).toBe(true);
  });

  it("still refuses a longer name, generic or not", () => {
    // The reason the fix is a WIDER DELIMITER CLASS and not a looser match:
    // drop the delimiter entirely and `<QueuePanel<T>>` would vouch for
    // `Queue`, trading a false negative for a false positive.
    expect(mountsAny(`render(() => <QueuePanel<Item> />)`, ["Queue"])).toBe(
      false,
    );
  });
});

describe("componentExportsOf", () => {
  it("takes const/function/class values and leaves types behind", () => {
    const src = `
      export type WidgetProps = { a: 1 };
      export interface Other { b: 2 }
      export const Widget = () => <div />;
      export function WidgetTwo() { return <div />; }
      export const useWidget = () => {};
    `;
    expect(componentExportsOf(src).sort()).toEqual(["Widget", "WidgetTwo"]);
  });

  it("takes names from a re-export list but not its inline types", () => {
    expect(
      componentExportsOf(
        `export { Widget, type WidgetProps } from "./Widget";`,
      ),
    ).toEqual(["Widget"]);
  });

  it("takes the alias, not the original, from a renaming re-export", () => {
    expect(
      componentExportsOf(`export { Widget as LegacyWidget } from "./Widget";`),
    ).toEqual(["LegacyWidget"]);
  });
});

describe("reexportsOf", () => {
  it("reads star and named re-exports, and skips plain imports", () => {
    const src = `
      import { thing } from "./thing";
      export * from "./A";
      export { B } from "./B";
    `;
    expect(reexportsOf(src)).toEqual(["./A", "./B"]);
  });
});
