import { render, fireEvent } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import {
  EpisodeCard,
  EpisodeSelection,
  SidebarSelector,
  type SidebarSelectorItem,
} from "./SidebarSelector";

interface Datum {
  name: string;
}
const items: SidebarSelectorItem<Datum>[] = [
  { id: "a", data: { name: "Alpha" } },
  { id: "b", data: { name: "Bravo" } },
  { id: "c", data: { name: "Charlie" } },
];

const cards = () =>
  [...document.querySelectorAll<HTMLButtonElement>(".sidebar-selector__card")];

const baseProps = () => ({
  items,
  renderCard: (d: Datum) => <span class="card-name">{d.name}</span>,
  renderSelection: (d: Datum | undefined) => (
    <span class="sel-name">{d ? d.name : "none"}</span>
  ),
});

describe("SidebarSelector", () => {
  it("renders a card button per item via renderCard", () => {
    render(() => <SidebarSelector {...baseProps()} onSelect={() => {}} />);
    expect(cards().length).toBe(3);
    expect(
      [...document.querySelectorAll(".card-name")].map((c) => c.textContent),
    ).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("marks the selected card and passes isSelected to renderCard", () => {
    render(() => (
      <SidebarSelector
        {...baseProps()}
        selectedId="b"
        onSelect={() => {}}
        renderCard={(d, isSelected) => (
          <span class="card-name">
            {d.name}
            {isSelected ? "*" : ""}
          </span>
        )}
      />
    ));
    const selected = cards().filter((c) =>
      c.classList.contains("sidebar-selector__card--selected"),
    );
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe("Bravo*");
  });

  it("calls onSelect with the clicked item", () => {
    const onSelect = vi.fn();
    render(() => <SidebarSelector {...baseProps()} onSelect={onSelect} />);
    fireEvent.click(cards()[2]);
    expect(onSelect).toHaveBeenCalledWith(items[2]);
  });

  it("renders the selection area from the selected item's data", () => {
    render(() => (
      <SidebarSelector {...baseProps()} selectedId="c" onSelect={() => {}} />
    ));
    expect(document.querySelector(".sel-name")?.textContent).toBe("Charlie");
  });

  it("passes undefined to renderSelection when nothing is selected", () => {
    render(() => <SidebarSelector {...baseProps()} onSelect={() => {}} />);
    expect(document.querySelector(".sel-name")?.textContent).toBe("none");
  });

  it("renders an optional label and honours the sidebar width", () => {
    render(() => (
      <SidebarSelector
        {...baseProps()}
        onSelect={() => {}}
        label="Episodes"
        sidebarWidth="360px"
      />
    ));
    expect(document.querySelector(".sidebar-selector__label")?.textContent).toBe(
      "Episodes",
    );
    expect(
      document.querySelector<HTMLElement>(".sidebar-selector__sidebar")?.style
        .width,
    ).toBe("360px");
  });
});

describe("EpisodeCard", () => {
  it("renders the season/episode code, character, and title", () => {
    const { container } = render(() => (
      <EpisodeCard
        episode={{
          title: "The Storm",
          season: 1,
          episode: 12,
          primaryCharacter: "Zuko",
        }}
        isSelected={false}
      />
    ));
    expect(container.querySelector(".episode-card__number")?.textContent).toBe(
      "S1E12",
    );
    expect(container.querySelector(".episode-card__character")?.textContent).toBe(
      "Zuko",
    );
    expect(container.querySelector(".episode-card__title")?.textContent).toBe(
      "The Storm",
    );
  });
});

describe("EpisodeSelection", () => {
  it("shows the empty prompt when no episode is given", () => {
    const { container } = render(() => <EpisodeSelection episode={undefined} />);
    expect(
      container.querySelector(".episode-selection__empty")?.textContent,
    ).toContain("Select an episode");
  });

  it("renders the episode details, hiding optional synopsis/date when absent", () => {
    const { container } = render(() => (
      <EpisodeSelection
        episode={{
          title: "The Blind Bandit",
          season: 2,
          episode: 6,
          primaryCharacter: "Toph",
        }}
      />
    ));
    expect(container.querySelector(".episode-selection__title")?.textContent).toBe(
      "The Blind Bandit",
    );
    expect(container.querySelector(".episode-selection__number")?.textContent)
      .toContain("Season 2");
    expect(container.querySelector(".episode-selection__synopsis")).toBeNull();
    expect(container.querySelector(".episode-selection__date")).toBeNull();
  });
});
