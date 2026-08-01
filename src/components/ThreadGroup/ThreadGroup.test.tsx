import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createThreadGroup } from "./ThreadGroup";
import { IndentedThreadGroup, FlatThreadGroup } from "./variants";

describe("ThreadGroup", () => {
  it("renders avatar / header / bubbles slots into their regions", () => {
    const Group = createThreadGroup({});
    const { container } = render(() => (
      <Group
        depth={0}
        color="#f00"
        variant="other"
        avatar={<span class="av">A</span>}
        header={<span class="hd">Name</span>}
        bubbles={<span class="bb">msg</span>}
      />
    ));
    const root = container.querySelector(".sui-thread-group")!;
    expect(root.querySelector(".av")).toBeTruthy();
    expect(root.querySelector(".sui-thread-group__header .hd")).toBeTruthy();
    expect(root.querySelector(".sui-thread-group__bubbles .bb")).toBeTruthy();
  });

  it("carries the variant class", () => {
    const Group = createThreadGroup({});
    const { container } = render(() => (
      <Group depth={0} color="#f00" variant="self" />
    ));
    expect(
      container
        .querySelector(".sui-thread-group")!
        .classList.contains("sui-thread-group--self"),
    ).toBe(true);
  });

  it("indents by depth*24px and tints the left border when threaded", () => {
    const Group = createThreadGroup({});
    const { container } = render(() => (
      <Group depth={2} color="rgb(255, 0, 0)" variant="other" />
    ));
    const root = container.querySelector(".sui-thread-group") as HTMLElement;
    expect(root.style.paddingLeft).toBe("48px");
    expect(root.style.borderLeftColor).toBe("rgb(255, 0, 0)");
  });

  it("depth 0 leaves the border transparent", () => {
    const Group = createThreadGroup({});
    const { container } = render(() => (
      <Group depth={0} color="rgb(255, 0, 0)" variant="other" />
    ));
    const root = container.querySelector(".sui-thread-group") as HTMLElement;
    expect(root.style.borderLeftColor).toBe("transparent");
    expect(root.style.paddingLeft).toBe("0px");
  });

  it("FlatThreadGroup suppresses depth indent; IndentedThreadGroup keeps it", () => {
    const { container } = render(() => (
      <>
        <FlatThreadGroup depth={3} color="#0f0" variant="other" />
        <IndentedThreadGroup depth={3} color="#0f0" variant="other" />
      </>
    ));
    const groups = container.querySelectorAll(
      ".sui-thread-group",
    ) as NodeListOf<HTMLElement>;
    expect(groups[0].style.paddingLeft).toBe("0px");
    expect(groups[1].style.paddingLeft).toBe("72px");
  });
});
