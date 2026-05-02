import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { AppShell, AppHeader, AppMain, AppNavLink, SidebarPanel } from "./index";

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

describe("AppNavLink", () => {
  it("renders a button with the nav-link class", () => {
    const { container } = render(() => <AppNavLink>Plan</AppNavLink>);
    const btn = container.firstElementChild as HTMLButtonElement;
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.type).toBe("button");
    expect(btn.className).toMatch(/app-nav-link/);
  });

  it("active=true adds active class", () => {
    const { container } = render(() => <AppNavLink active>Plan</AppNavLink>);
    expect(container.firstElementChild!.className).toMatch(/app-nav-link--active/);
  });
});

describe("SidebarPanel", () => {
  it("renders an aside with default 280px width", () => {
    const { container } = render(() => <SidebarPanel>x</SidebarPanel>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("ASIDE");
    expect(root.style.width).toBe("280px");
    expect(root.className).toMatch(/app-sidebar--left/);
  });

  it("custom width applied inline", () => {
    const { container } = render(() => <SidebarPanel width={420}>x</SidebarPanel>);
    expect((container.firstElementChild as HTMLElement).style.width).toBe("420px");
  });

  it("side='right' adds the right modifier", () => {
    const { container } = render(() => <SidebarPanel side="right">x</SidebarPanel>);
    expect(container.firstElementChild!.className).toMatch(/app-sidebar--right/);
  });
});
