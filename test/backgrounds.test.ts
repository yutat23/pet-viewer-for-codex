import { describe, expect, it } from "vitest";
import { getStrings } from "../src/localization.js";
import {
  isPetBackgroundId,
  petBackgroundsForDisplay,
  PET_BACKGROUND_IDS
} from "../src/webview/backgrounds.js";

describe("Pet backgrounds", () => {
  it("defines unique background IDs", () => {
    const ids = PET_BACKGROUND_IDS;
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("defines the twenty procedural scenes plus None", () => {
    expect(PET_BACKGROUND_IDS).toHaveLength(21);
    expect(PET_BACKGROUND_IDS[0]).toBe("none");
  });

  it("displays None first and scene names alphabetically", () => {
    const labels = petBackgroundsForDisplay(getStrings("en")).map((background) => background.label);
    expect(labels[0]).toBe("None");
    expect(labels.slice(1)).toEqual([...labels.slice(1)].sort((left, right) => left.localeCompare(right, "en")));
  });

  it("localizes scene names", () => {
    expect(petBackgroundsForDisplay(getStrings("ja"))[0]?.label).toBe("なし");
  });

  it("validates persisted background IDs", () => {
    expect(isPetBackgroundId("underwater")).toBe(true);
    expect(isPetBackgroundId("unknown-place")).toBe(false);
  });
});
