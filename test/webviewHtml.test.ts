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
      expect(html, backgroundId).toContain(`backgroundId==='${backgroundId}'`);
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
});
