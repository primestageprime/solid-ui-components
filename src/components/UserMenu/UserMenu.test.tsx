import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { UserMenu, userInitials, userMenuItems } from "./UserMenu";

// The panel portals to document.body, so panel queries go to the body.
afterEach(cleanup);

const open = (root: HTMLElement): void => {
  fireEvent.click(root.querySelector(".sui-popover-menu__trigger")!);
};
const itemLabels = (): string[] =>
  [...document.body.querySelectorAll(".sui-popover-menu__item")].map(
    (el) => el.textContent?.trim() ?? "",
  );
const clickItem = (label: string): void => {
  const el = [...document.body.querySelectorAll<HTMLElement>(".sui-popover-menu__item")].find(
    (one) => one.textContent?.trim() === label,
  );
  fireEvent.click(el!);
};

const ADA = { name: "Ada Lovelace", email: "ada@example.com" };

describe("userInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(userInitials(ADA)).toBe("AL");
    expect(userInitials({ name: "  grace  ", email: "g@x.io" })).toBe("G");
  });
  it("falls back to the email's first letter, then to ?", () => {
    expect(userInitials({ name: "", email: "zed@x.io" })).toBe("Z");
    expect(userInitials({ name: "", email: "" })).toBe("?");
    expect(userInitials(undefined)).toBe("?");
  });
});

describe("userMenuItems", () => {
  it("appends exactly one of Sign in / Sign out after the caller's items", () => {
    const settings = { id: "settings", label: "Settings" };
    expect(userMenuItems([settings], true).map((i) => i.label)).toEqual([
      "Settings",
      "Sign out",
    ]);
    expect(userMenuItems([], false).map((i) => i.label)).toEqual(["Sign in"]);
  });
});

describe("UserMenu", () => {
  it("signed in: shows initials, the email header, the caller's items and Sign out", () => {
    const { container } = render(() => (
      <UserMenu
        user={ADA}
        items={[{ id: "settings", label: "Settings", icon: "gear" }]}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />
    ));
    expect(container.textContent).toContain("AL");
    open(container);
    expect(document.body.textContent).toContain("ada@example.com");
    expect(itemLabels()).toEqual(["Settings", "Sign out"]);
  });

  it("signed out: ? avatar, 'Not signed in', and Sign in fires onSignIn", () => {
    const onSignIn = vi.fn();
    const onSignOut = vi.fn();
    const { container } = render(() => (
      <UserMenu onSignIn={onSignIn} onSignOut={onSignOut} />
    ));
    expect(container.textContent).toContain("?");
    open(container);
    expect(document.body.textContent).toContain("Not signed in");
    clickItem("Sign in");
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("routes a caller item to onSelect and Sign out to onSignOut, never both", () => {
    const onSelect = vi.fn();
    const onSignOut = vi.fn();
    const { container } = render(() => (
      <UserMenu
        user={ADA}
        items={[{ id: "settings", label: "Settings" }]}
        onSelect={onSelect}
        onSignIn={() => {}}
        onSignOut={onSignOut}
      />
    ));
    open(container);
    clickItem("Settings");
    expect(onSelect).toHaveBeenCalledWith("settings");
    open(container);
    clickItem("Sign out");
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders the optional status line under the email", () => {
    const { container } = render(() => (
      <UserMenu
        user={ADA}
        status={<span data-testid="status">3 open</span>}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />
    ));
    open(container);
    expect(document.body.querySelector('[data-testid="status"]')?.textContent).toBe(
      "3 open",
    );
  });
});
