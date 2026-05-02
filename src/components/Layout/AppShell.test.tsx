import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { AppShell, AppHeader, AppMain } from "./index";

describe("AppShell / AppHeader / AppMain", () => {
  it("AppShell renders an app-shell div", () => {
    const { container } = render(() => <AppShell>x</AppShell>);
    expect(container.firstElementChild!.className).toMatch(/app-shell/);
  });

  it("AppHeader applies the size class", () => {
    const { container } = render(() => <AppHeader size="sm">x</AppHeader>);
    expect(container.firstElementChild!.className).toMatch(/app-header--sm/);
  });

  it("AppHeader inline mode adds inline class", () => {
    const { container } = render(() => <AppHeader inline>x</AppHeader>);
    expect(container.firstElementChild!.className).toMatch(/app-header--inline/);
  });

  it("AppMain padded adds padded class", () => {
    const { container } = render(() => <AppMain padded>x</AppMain>);
    expect(container.firstElementChild!.className).toMatch(/app-main--padded/);
  });
});
