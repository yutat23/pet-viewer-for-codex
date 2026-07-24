import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const japaneseMessages = JSON.parse(readFileSync("package.nls.json", "utf8"));
const englishMessages = JSON.parse(readFileSync("package.nls.en.json", "utf8"));

describe("extension manifest", () => {
  it("registers the animation speed picker in the PET context menu", () => {
    const command = "codexPet.selectAnimationSpeed";
    expect(manifest.activationEvents).toContain(`onCommand:${command}`);
    expect(manifest.contributes.commands).toContainEqual(expect.objectContaining({ command }));
    expect(manifest.contributes.menus["webview/context"]).toContainEqual(
      expect.objectContaining({ command, group: "navigation@5" })
    );
  });

  it("registers the Pet size picker and supports auto scale", () => {
    const command = "codexPet.selectSize";
    expect(manifest.activationEvents).toContain(`onCommand:${command}`);
    expect(manifest.contributes.commands).toContainEqual(expect.objectContaining({ command }));
    expect(manifest.contributes.menus["webview/context"]).toContainEqual(
      expect.objectContaining({ command, group: "navigation@6" })
    );
    expect(manifest.contributes.configuration.properties["codexPet.scale"].anyOf).toContainEqual(
      expect.objectContaining({ type: "string", enum: ["auto"] })
    );
  });

  it("registers a persistent custom image background and opacity controls", () => {
    const commands = ["codexPet.selectCustomBackground", "codexPet.selectBackgroundOpacity"];
    for (const command of commands) {
      expect(manifest.activationEvents).toContain(`onCommand:${command}`);
      expect(manifest.contributes.commands).toContainEqual(expect.objectContaining({ command }));
      expect(manifest.contributes.menus["webview/context"]).toContainEqual(
        expect.objectContaining({ command, when: expect.stringContaining("config.codexPet.background == custom") })
      );
    }
    const properties = manifest.contributes.configuration.properties;
    expect(properties["codexPet.background"].enum).toContain("custom");
    expect(properties["codexPet.customBackground.imagePath"]).toMatchObject({
      type: "string",
      default: ""
    });
    expect(properties["codexPet.customBackground.opacity"]).toMatchObject({
      type: "number",
      default: 1,
      minimum: 0,
      maximum: 1
    });
  });

  it("defines every manifest localization key in Japanese and English", () => {
    const placeholders = JSON.stringify(manifest).match(/%([^%]+)%/g) ?? [];
    for (const placeholder of placeholders) {
      const key = placeholder.slice(1, -1);
      expect(englishMessages[key], key).toBeTypeOf("string");
      expect(japaneseMessages[key], key).toBeTypeOf("string");
    }
    expect(Object.keys(japaneseMessages).sort()).toEqual(Object.keys(englishMessages).sort());
    expect(japaneseMessages["extension.displayName"]).toBe("Codex ペットビューアー");
    expect(englishMessages["extension.displayName"]).toBe("Pet Viewer for Codex");
  });
});
