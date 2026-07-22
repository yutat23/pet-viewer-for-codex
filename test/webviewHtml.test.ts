import { describe, expect, it } from "vitest";
import { getWebviewHtml } from "../src/webview/getWebviewHtml.js";
import { PET_BACKGROUNDS } from "../src/webview/backgrounds.js";

describe("Pet webview HTML", () => {
  it("contains syntactically valid webview JavaScript", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never);
    const script = html.match(/<script nonce="[^"]+">([\s\S]+)<\/script>/)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script!)).not.toThrow();
  });

  it("contains a procedural renderer for every bundled scene", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never);
    for (const background of PET_BACKGROUNDS) {
      if (background.id === "none") continue;
      expect(html, background.id).toContain(`backgroundId==='${background.id}'`);
    }
  });

  it("holds the idle rest frame for a random two to five seconds", () => {
    const html = getWebviewHtml({ cspSource: "test-source" } as never);
    expect(html).toContain("pet.state === 'idle'");
    expect(html).toContain("2000 + Math.round(Math.random() * 3000)");
  });
});
