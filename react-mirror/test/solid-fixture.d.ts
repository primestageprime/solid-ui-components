// The typed seam to the Solid side of the drift test (test/solid/fixture.tsx,
// which is checked against SUI's own tsconfig).
declare module "solid-fixture" {
  export const solidTables: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
  export const solidBases: Readonly<Record<string, unknown>>;
  export const renderSolid: (
    component: unknown,
    props: Readonly<Record<string, unknown>>,
    children?: string,
  ) => HTMLElement;
}
