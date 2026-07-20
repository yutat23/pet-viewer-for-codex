import { describe, expect, it } from "vitest";
import { getBackgroundPosition, toCssPosition } from "../src/webview/spriteMath.js";

describe("sprite background positions", () => {
  it("handles a one-cell sheet", () => {
    expect(toCssPosition(getBackgroundPosition(0, 0, 1, 1))).toBe("0% 0%");
  });

  it("maps the first and last frames", () => {
    expect(getBackgroundPosition(0, 0, 8, 11)).toEqual({ xPercent: 0, yPercent: 0 });
    expect(getBackgroundPosition(7, 10, 8, 11)).toEqual({ xPercent: 100, yPercent: 100 });
  });

  it("maps an intermediate frame", () => {
    expect(getBackgroundPosition(3, 5, 8, 11)).toEqual({
      xPercent: (3 / 7) * 100,
      yPercent: 50
    });
  });

  it("rejects out-of-range coordinates", () => {
    expect(() => getBackgroundPosition(8, 0, 8, 11)).toThrow(RangeError);
    expect(() => getBackgroundPosition(0, -1, 8, 11)).toThrow(RangeError);
  });
});
