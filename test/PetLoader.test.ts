import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PetLoader } from "../src/pet/PetLoader.js";

let temporaryRoot: string;

beforeEach(async () => {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-pet-test-"));
});

afterEach(async () => {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
});

describe("PetLoader", () => {
  it("reports a missing pets directory", async () => {
    const result = await new PetLoader(path.join(temporaryRoot, "missing")).load();
    expect(result.directoryExists).toBe(false);
    expect(result.pets).toEqual([]);
  });

  it("loads the observed v2 Pet layout and Unicode names", async () => {
    const directory = path.join(temporaryRoot, "pets", "penguin");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, "pet.json"),
      JSON.stringify({
        id: "penguin",
        displayName: "ペンギン",
        description: "A test Pet",
        spriteVersionNumber: 2,
        spritesheetPath: "spritesheet.webp"
      })
    );
    await fs.writeFile(path.join(directory, "spritesheet.webp"), makeVp8x(1536, 2288));

    const result = await new PetLoader(path.join(temporaryRoot, "pets")).load();
    expect(result.issues).toEqual([]);
    expect(result.pets[0]).toMatchObject({
      id: "penguin",
      name: "ペンギン",
      columns: 8,
      rows: 11,
      frameWidth: 192,
      frameHeight: 208
    });
    expect(result.pets[0]?.animations.idle).toMatchObject({ row: 0, frameCount: 6, loop: true });
    expect(result.pets[0]?.animations).toMatchObject({
      running: { row: 7, frameCount: 6 },
      waiting: { row: 6, frameCount: 6 },
      review: { row: 8, frameCount: 6 },
      failed: { row: 5, frameCount: 8 }
    });
  });

  it("skips corrupt manifests while preserving valid Pets", async () => {
    const pets = path.join(temporaryRoot, "pets");
    await createValidPet(path.join(pets, "valid"));
    await fs.mkdir(path.join(pets, "broken"), { recursive: true });
    await fs.writeFile(path.join(pets, "broken", "pet.json"), "{broken");

    const result = await new PetLoader(pets).load();
    expect(result.pets).toHaveLength(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.directoryName).toBe("broken");
  });

  it("rejects sprite paths outside the Pet directory", async () => {
    const directory = path.join(temporaryRoot, "pets", "unsafe");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "pet.json"), JSON.stringify({ spritesheetPath: "../outside.webp" }));

    const result = await new PetLoader(path.join(temporaryRoot, "pets")).load();
    expect(result.pets).toHaveLength(0);
    expect(result.issues[0]?.message).toMatch(/must stay inside/);
  });

  it("skips a Pet with no sprite image", async () => {
    const directory = path.join(temporaryRoot, "pets", "missing-image");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "pet.json"), "{}");

    const result = await new PetLoader(path.join(temporaryRoot, "pets")).load();
    expect(result.pets).toEqual([]);
    expect(result.issues[0]?.message).toMatch(/No supported sprite image/);
  });
});

async function createValidPet(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "pet.json"),
    JSON.stringify({ id: path.basename(directory), spriteVersionNumber: 2, spritesheetPath: "spritesheet.webp" })
  );
  await fs.writeFile(path.join(directory, "spritesheet.webp"), makeVp8x(1536, 2288));
}

function makeVp8x(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}
