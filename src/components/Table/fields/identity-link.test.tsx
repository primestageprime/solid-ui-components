import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { identityLinkCol } from "./identity-link";
import { geo as nameGeo } from "./name";

afterEach(cleanup);

// IdentityLink cell (ruled 2026-07-18): an entity with a detail page displays
// its name AS the link. Configure-time href/glyph; name geometry; blank empty.

interface Row {
  vessel_name: string;
  call_id: string;
}

const ROW: Row = { vessel_name: "Coral Dawn", call_id: "vc-42" };

const accessorOf = <T,>(colDef: { accessor: unknown }) =>
  colDef.accessor as (row: T) => JSX.Element;

describe("identityLinkCol — factory shape", () => {
  const linkCol = identityLinkCol<Row>("vessel_name", {
    href: (r) => `/detail/${r.call_id}`,
  });

  it("carries name geometry with a humanized left header, sortable by name", () => {
    expect(linkCol.id).toBe("vessel_name");
    expect(linkCol.header).toBe("Vessel Name");
    expect(linkCol.ellipsis).toBe(true);
    expect(linkCol.geo).toBe(nameGeo);
    expect(linkCol.sortValue?.(ROW)).toBe("Coral Dawn");
  });

  it("honors a header override", () => {
    const c = identityLinkCol<Row>("vessel_name", {
      href: (r) => `/detail/${r.call_id}`,
      header: "Vessel",
    });
    expect(c.header).toBe("Vessel");
  });
});

describe("identityLinkCol — cell render", () => {
  it("renders the name as an anchor to the configured detail href", () => {
    const c = identityLinkCol<Row>("vessel_name", {
      href: (r) => `/detail/${r.call_id}`,
    });
    const { container } = render(() => accessorOf<Row>(c)(ROW));
    const a = container.querySelector("a.sui-identity-link");
    expect(a?.getAttribute("href")).toBe("/detail/vc-42");
    expect(a?.textContent).toBe("Coral Dawn");
  });

  it("renders the configured glyph before the name", () => {
    const c = identityLinkCol<Row>("vessel_name", {
      href: (r) => `/detail/${r.call_id}`,
      glyph: () => <span class="test-glyph">⚓</span>,
    });
    const { container } = render(() => accessorOf<Row>(c)(ROW));
    const a = container.querySelector("a.sui-identity-link");
    expect(a?.querySelector(".test-glyph")?.textContent).toBe("⚓");
  });

  it("renders blank for an empty name — never a dead link (ruled 2026-07-18)", () => {
    const c = identityLinkCol<Row>("vessel_name", {
      href: (r) => `/detail/${r.call_id}`,
    });
    const { container } = render(() =>
      accessorOf<Row>(c)({ vessel_name: "", call_id: "vc-1" }),
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("");
  });
});
