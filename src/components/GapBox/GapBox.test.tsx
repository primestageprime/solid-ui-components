import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { GapBox, gapBoxJson } from "./GapBox";

afterEach(cleanup);

describe("gapBoxJson", () => {
  it("defaults kind to visual, nearest to none, props to null", () => {
    expect(JSON.parse(gapBoxJson({}))).toEqual({ kind: "visual", nearest: "none", props: null });
  });

  it("carries the stated kind, nearest and props", () => {
    const json = JSON.parse(
      gapBoxJson({ kind: "behaviour", nearest: "HotkeyButton", props: { scopes: ["modal"] } }),
    );
    expect(json).toEqual({ kind: "behaviour", nearest: "HotkeyButton", props: { scopes: ["modal"] } });
  });
});

describe("GapBox", () => {
  it("titles the box GAP: <title> and shows the JSON", () => {
    const { container } = render(() => (
      <GapBox title="LocaleSwitcher" nearest="none" props={{ locales: ["en-US"] }} />
    ));
    expect(container.textContent).toContain("GAP: LocaleSwitcher");
    expect(container.querySelector("pre")?.textContent).toContain('"locales"');
  });

  it("mounts with only a title", () => {
    const { container } = render(() => <GapBox title="ShareDialog" />);
    expect(container.textContent).toContain("GAP: ShareDialog");
    expect(container.querySelector("pre")?.textContent).toContain('"kind": "visual"');
  });
});
