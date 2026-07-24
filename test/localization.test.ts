import { describe, expect, it } from "vitest";
import { getStrings, selectLocale } from "../src/localization.js";

describe("localization", () => {
  it("uses English only for English display languages", () => {
    expect(selectLocale("en")).toBe("en");
    expect(selectLocale("en-US")).toBe("en");
    expect(selectLocale("ja")).toBe("ja");
    expect(selectLocale("fr")).toBe("ja");
  });

  it("localizes state labels and Hooks consent", () => {
    expect(getStrings("en").stateLabels.running).toBe("Running");
    expect(getStrings("ja").stateLabels.running).toBe("実行中");
    expect(getStrings("ja").hooks.confirmMessage("hooks.json", "hook.cjs")).toContain("/hooks");
  });
});
