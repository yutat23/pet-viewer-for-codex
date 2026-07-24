import { describe, expect, it } from "vitest";
import { getStrings } from "../src/localization.js";
import { getWebviewHtml } from "../src/webview/getWebviewHtml.js";
import { PET_BACKGROUND_IDS } from "../src/webview/backgrounds.js";

describe("Pet webview HTML", () => {
  it("contains syntactically valid webview JavaScript", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("en"));
    const script = html.match(/<script nonce="[^"]+">([\s\S]+)<\/script>/)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script!)).not.toThrow();
  });

  it("contains a procedural renderer for every bundled scene", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("en"));
    for (const backgroundId of PET_BACKGROUND_IDS) {
      if (backgroundId === "none") continue;
      const escaped = backgroundId.replace(/[-]/g, "\\$&");
      const pattern = new RegExp(`['"]?${escaped}['"]?\\s*:\\s*\\{`);
      expect(html, backgroundId).toMatch(pattern);
    }
  });

  it("holds the idle rest frame for a random two to five seconds", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("en"));
    expect(html).toContain("pet.state === 'idle'");
    expect(html).toContain("2000 + Math.round(Math.random() * 3000)");
  });

  it("renders Japanese UI and the Hooks onboarding action", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("ja"));
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("Hooks の信頼または最初のイベントを待っています");
    expect(html).toContain("setupHooks");
  });

  it("uses the same Pet sizing constraints with and without a background", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("en"));
    expect(html).toContain(".pet { position: absolute;");
    expect(html).toContain("max-width: 92%; max-height: 90%");
    expect(html).toContain(".stage.has-background .pet { filter:");
    expect(html).not.toContain(".stage.has-background .pet { position:");
  });

  it("fits auto size to the stage and recalculates after resize", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("en"));
    expect(html).toContain("pet.scale === 'auto'");
    expect(html).toContain("stage.clientWidth * 0.92 / pet.frameWidth");
    expect(html).toContain("stage.clientHeight * 0.9 / pet.frameHeight");
    expect(html).toContain("if (currentPet?.scale === 'auto')");
  });

  it("renders custom images decoratively and never layers them over Canvas scenes", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("en"));
    expect(html).toContain('id="pet-custom-background"');
    expect(html).toContain('aria-hidden="true" alt="" hidden');
    expect(html).toContain(".custom-background { object-fit: cover; image-rendering: auto; }");
    expect(html).toContain("const hasCanvasBackground = !hasCustomBackground");
    expect(html).toContain("background.hidden = !hasCanvasBackground");
    expect(html).toContain("customBackground.style.opacity");
    expect(html).toContain("type: 'customBackgroundLoadFailed'");
  });

  it("plays one localized waving reaction on activation and restores the latest state", () => {
    const english = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("en"));
    const japanese = getWebviewHtml({ cspSource: "test-source" } as never, getStrings("ja"));
    expect(english).toContain('role="button" tabindex="0"');
    expect(english).toContain(".pet:focus-visible { outline:");
    expect(english).toContain("sprite.addEventListener('click', (event)");
    expect(english).toContain("if (event.button === 0) wavePet()");
    expect(english).toContain("event.key !== 'Enter' && event.key !== ' '");
    expect(english).toContain("interactionCooldownUntil = now + 1500");
    expect(english).toContain("currentPet = data.pet");
    expect(english).toContain("if (!interactionActive) showPet(data.pet)");
    expect(english).toContain("if (currentPet) showPet(currentPet)");
    expect(english).toContain("loadedSpriteUri === pet.spriteUri");
    expect(english).toContain("startRendering(loadedSpriteSheet)");
    expect(english).toContain("if (sprite.width !== width) sprite.width = width");
    expect(english).toContain("if (sprite.height !== height) sprite.height = height");
    expect(english).toContain('"waveAction":"Wave hello"');
    expect(english).toContain('"wavingStatus":"Waving"');
    expect(japanese).toContain('"waveAction":"手を振ってもらう"');
    expect(japanese).toContain('"wavingStatus":"手を振っています"');
  });
});
