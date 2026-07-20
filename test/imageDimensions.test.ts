import { describe, expect, it } from "vitest";
import { readImageDimensions } from "../src/pet/imageDimensions.js";

describe("readImageDimensions", () => {
  it("reads PNG dimensions", () => {
    const buffer = Buffer.alloc(24);
    buffer.set(Buffer.from([0x89, 0x50, 0x4e, 0x47]), 0);
    buffer.writeUInt32BE(1536, 16);
    buffer.writeUInt32BE(2288, 20);
    expect(readImageDimensions(buffer)).toEqual({ width: 1536, height: 2288, format: "png" });
  });

  it("reads WebP VP8X dimensions", () => {
    const buffer = Buffer.alloc(30);
    buffer.write("RIFF", 0, "ascii");
    buffer.write("WEBP", 8, "ascii");
    buffer.write("VP8X", 12, "ascii");
    buffer.writeUIntLE(1536 - 1, 24, 3);
    buffer.writeUIntLE(2288 - 1, 27, 3);
    expect(readImageDimensions(buffer)).toEqual({ width: 1536, height: 2288, format: "webp" });
  });

  it("rejects unknown data", () => {
    expect(() => readImageDimensions(Buffer.from("not an image"))).toThrow(/Unsupported or malformed/);
  });
});
