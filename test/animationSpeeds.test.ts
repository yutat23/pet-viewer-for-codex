import { describe, expect, it } from "vitest";
import { ANIMATION_SPEEDS } from "../src/webview/animationSpeeds.js";

describe("Pet animation speeds", () => {
  it("defines unique presets in ascending order", () => {
    const values = ANIMATION_SPEEDS.map((speed) => speed.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toEqual([...values].sort((left, right) => left - right));
  });

  it("includes the configured range and normal speed", () => {
    expect(ANIMATION_SPEEDS[0]?.value).toBe(0.25);
    expect(ANIMATION_SPEEDS.at(-1)?.value).toBe(3);
    expect(ANIMATION_SPEEDS.some((speed) => speed.value === 1)).toBe(true);
  });
});
