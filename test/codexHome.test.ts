import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { getCodexHome, getPetsDirectory } from "../src/pet/codexHome.js";

describe("Codex home resolution", () => {
  it("prefers a non-empty CODEX_HOME", () => {
    expect(getCodexHome({ CODEX_HOME: "  C:\\custom-codex  " }, "C:\\Users\\tester")).toBe(
      path.resolve("C:\\custom-codex")
    );
  });

  it("falls back to the user home when CODEX_HOME is blank", () => {
    expect(getCodexHome({ CODEX_HOME: "  " }, "C:\\Users\\tester")).toBe(
      path.join("C:\\Users\\tester", ".codex")
    );
    expect(getPetsDirectory({}, "C:\\Users\\tester")).toBe(
      path.join("C:\\Users\\tester", ".codex", "pets")
    );
  });
});
