import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { FileDropTarget, CompactFileDropTarget } from "./index";

const pdf = () => new File(["%PDF-1.4"], "power-log.pdf", { type: "application/pdf" });
const png = () => new File(["x"], "photo.png", { type: "image/png" });

/** A drop event carrying `files` — jsdom's DragEvent has no dataTransfer. */
const dropWith = (zone: HTMLElement, ...files: File[]) =>
  fireEvent.drop(zone, { dataTransfer: { files } });

const zoneOf = (container: HTMLElement) =>
  container.querySelector(".sui-file-drop") as HTMLElement;

describe("FileDropZone", () => {
  it("hands an accepted file to the caller", () => {
    const taken: string[] = [];
    const { container } = render(() => (
      <FileDropTarget
        accept={[".pdf"]}
        label="Drop the power log here"
        onFile={(f) => taken.push(f.name)}
      />
    ));
    dropWith(zoneOf(container), pdf());
    expect(taken).toEqual(["power-log.pdf"]);
  });

  it("rejects an unaccepted extension and says which format it wants", () => {
    const taken: string[] = [];
    const { container, getByText } = render(() => (
      <FileDropTarget
        accept={[".pdf"]}
        label="Drop the power log here"
        onFile={(f) => taken.push(f.name)}
      />
    ));
    dropWith(zoneOf(container), png());
    expect(taken).toEqual([]);
    expect(getByText("PDF only — drop a .pdf file")).toBeTruthy();
  });

  it("takes no file at all while disabled", () => {
    const taken: string[] = [];
    const { container } = render(() => (
      <FileDropTarget
        accept={[".pdf"]}
        label="Drop the power log here"
        disabled
        onFile={(f) => taken.push(f.name)}
      />
    ));
    const zone = zoneOf(container);
    expect(zone.getAttribute("aria-disabled")).toBe("true");
    expect(zone.tabIndex).toBe(-1);
    dropWith(zone, pdf());
    expect(taken).toEqual([]);
  });

  it("lights the target up while a file is dragged over it", () => {
    const { container } = render(() => (
      <FileDropTarget accept={[".pdf"]} label="Drop it" onFile={() => undefined} />
    ));
    const zone = zoneOf(container);
    fireEvent.dragOver(zone);
    expect(zone.className).toContain("sui-file-drop--over");
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain("sui-file-drop--over");
  });

  it("bakes density into the curried variant, not the call site", () => {
    const { container } = render(() => (
      <>
        <FileDropTarget accept={[".pdf"]} label="a" onFile={() => undefined} />
        <CompactFileDropTarget accept={[".pdf"]} label="b" onFile={() => undefined} />
      </>
    ));
    const zones = container.querySelectorAll(".sui-file-drop");
    expect(zones[0].className).toContain("sui-file-drop--comfortable");
    expect(zones[1].className).toContain("sui-file-drop--compact");
  });
});
