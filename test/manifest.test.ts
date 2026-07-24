import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));

describe("extension manifest", () => {
  it("registers the animation speed picker in the PET context menu", () => {
    const command = "codexPet.selectAnimationSpeed";
    expect(manifest.activationEvents).toContain(`onCommand:${command}`);
    expect(manifest.contributes.commands).toContainEqual(expect.objectContaining({ command }));
    expect(manifest.contributes.menus["webview/context"]).toContainEqual(
      expect.objectContaining({ command, group: "navigation@3" })
    );
  });
});
