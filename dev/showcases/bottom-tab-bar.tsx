// BottomTabBar — the phone's primary nav. The showcase plays the consumer:
// it owns the five sections and their icon paths, and tracks the current tab
// in a signal (an app would read its router's location instead). Hrefs are
// "#…" fragments so clicking here never leaves the catalog.
import { createSignal, type Component } from "solid-js";
import { BottomTabBar } from "../../src/components/BottomTabBar";
import { SectionTitle, MutedBody } from "../../src/components/Text";

const TABS = [
  {
    href: "#home",
    label: "Home",
    icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  },
  {
    href: "#books",
    label: "Books",
    icon: "M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z",
  },
  { href: "#vote", label: "Vote", icon: "M4 12l5 5L20 6" },
  {
    href: "#reading",
    label: "Reading",
    icon: "M2 6s3-2 10-2 10 2 10 2v14s-3-2-10-2S2 20 2 20zM12 4v14",
  },
  {
    href: "#club",
    label: "Club",
    icon: "M16 11a4 4 0 1 0-8 0M3 21a9 9 0 0 1 18 0",
  },
];

export const BottomTabBarShowcase: Component = () => {
  const [active, setActive] = createSignal("#home");
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>BottomTabBar</SectionTitle>
        <MutedBody>
          Icon-over-label tabs pinned under a phone page. Plain links: pass{" "}
          <code>items</code> and the current
          <code> active</code> href. Current: {active()}
        </MutedBody>
        <div
          class="bottom-tab-bar-demo"
          onClick={(e) => {
            const a = (e.target as HTMLElement).closest("a");
            if (a) {
              e.preventDefault();
              setActive(a.getAttribute("href") ?? "#home");
            }
          }}
        >
          <BottomTabBar items={TABS} active={active()} />
        </div>
      </div>
    </div>
  );
};
