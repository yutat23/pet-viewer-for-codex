import { describe, expect, it } from "vitest";
import {
  isPetBackgroundId,
  petBackgroundsForDisplay,
  PET_BACKGROUNDS
} from "../src/webview/backgrounds.js";

describe("Pet backgrounds", () => {
  it("defines unique background IDs", () => {
    const ids = PET_BACKGROUNDS.map((background) => background.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("defines the twenty procedural scenes plus None", () => {
    expect(PET_BACKGROUNDS).toHaveLength(21);
    expect(PET_BACKGROUNDS[0]?.id).toBe("none");
  });

  it("displays None first and scene names alphabetically", () => {
    const labels = petBackgroundsForDisplay().map((background) => background.label);
    expect(labels[0]).toBe("None");
    expect(labels.slice(1)).toEqual([...labels.slice(1)].sort((left, right) => left.localeCompare(right, "en")));
  });

  it("validates persisted background IDs", () => {
    expect(isPetBackgroundId("underwater")).toBe(true);
    expect(isPetBackgroundId("unknown-place")).toBe(false);
  });
});
