import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Kbd, createKbd } from "./index";

describe("Kbd", () => {
  it("renders literal children when no letter is given", () => {
    const { container } = render(() => <Kbd>Esc</Kbd>);
    const kbd = container.querySelector("kbd.sui-kbd")!;
    expect(kbd.textContent).toBe("Esc");
    expect(kbd.querySelector(".sui-kbd__letter")).toBeNull();
  });

  it("splits letter and rest into their own spans", () => {
    const { container } = render(() => <Kbd letter="C" rest="onfirm" />);
    expect(container.querySelector(".sui-kbd__letter")!.textContent).toBe("C");
    expect(container.querySelector(".sui-kbd__rest")!.textContent).toBe("onfirm");
  });

  it("omits the rest span when only a letter is given", () => {
    const { container } = render(() => <Kbd letter="X" />);
    expect(container.querySelector(".sui-kbd__letter")!.textContent).toBe("X");
    expect(container.querySelector(".sui-kbd__rest")).toBeNull();
  });

  it("merges an extra class onto the kbd element", () => {
    const { container } = render(() => <Kbd class="mono">A</Kbd>);
    expect(container.querySelector(".sui-kbd")!.classList.contains("mono")).toBe(true);
  });

  it("createKbd bakes defaults that render through", () => {
    const Curried = createKbd({ letter: "S", rest: "ave" });
    const { container } = render(() => <Curried />);
    expect(container.querySelector(".sui-kbd__letter")!.textContent).toBe("S");
    expect(container.querySelector(".sui-kbd__rest")!.textContent).toBe("ave");
  });
});
