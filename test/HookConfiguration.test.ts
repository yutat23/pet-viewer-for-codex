import { describe, expect, it } from "vitest";
import {
  hookCommand,
  mergeCodexPetHooks,
  removeCodexPetHooks
} from "../src/codex/HookConfiguration.js";

describe("Codex Pet Hook configuration", () => {
  it("adds its handlers without replacing existing hooks", () => {
    const command = hookCommand("C:\\Codex Pet\\hook.cjs");
    const existing = {
      description: "keep me",
      hooks: {
        Stop: [{ matcher: "anything", hooks: [{ type: "command", command: "existing" }] }],
        CustomEvent: [{ hooks: [{ type: "command", command: "custom" }] }]
      }
    };
    const merged = mergeCodexPetHooks(existing, command);
    expect(merged.description).toBe("keep me");
    expect((merged.hooks as Record<string, unknown[]>).Stop).toHaveLength(2);
    expect((merged.hooks as Record<string, unknown[]>).CustomEvent).toEqual(existing.hooks.CustomEvent);
  });

  it("is idempotent and removes only its own command", () => {
    const command = hookCommand("/tmp/codex-pet/hook.cjs");
    const once = mergeCodexPetHooks({}, command);
    const twice = mergeCodexPetHooks(once, command);
    expect((twice.hooks as Record<string, unknown[]>).Stop).toHaveLength(1);
    const removed = removeCodexPetHooks(twice, command);
    expect((removed.hooks as Record<string, unknown[]>).Stop).toEqual([]);
  });
});
