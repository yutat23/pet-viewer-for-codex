import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HookEventStateTracker,
  isWithinWorkspace,
  parseCodexHookEvent,
  type CodexHookEvent,
  type CodexHookEventName
} from "../src/codex/HookEventStateTracker.js";

function event(eventName: CodexHookEventName, sessionId = "session-a"): CodexHookEvent {
  return { version: 1, eventName, sessionId, cwd: path.resolve("workspace"), occurredAt: 1 };
}

describe("HookEventStateTracker", () => {
  it("maps lifecycle events and settles completed sessions", () => {
    const tracker = new HookEventStateTracker();
    expect(tracker.handle(event("UserPromptSubmit")).state).toBe("running");
    expect(tracker.handle(event("PermissionRequest")).state).toBe("waiting");
    expect(tracker.handle(event("PostToolUse")).state).toBe("running");
    expect(tracker.handle(event("Stop")).state).toBe("review");
    expect(tracker.settle("session-a")).toBe("idle");
  });

  it("aggregates multiple sessions by visible priority", () => {
    const tracker = new HookEventStateTracker();
    tracker.handle(event("UserPromptSubmit", "running"));
    expect(tracker.handle(event("PermissionRequest", "waiting")).state).toBe("waiting");
    expect(tracker.handle(event("Stop", "finished")).state).toBe("waiting");
    expect(tracker.settle("waiting")).toBe("running");
  });

  it("validates events and workspace containment", () => {
    expect(parseCodexHookEvent(event("SessionStart"))).toBeDefined();
    expect(parseCodexHookEvent({ ...event("SessionStart"), version: 2 })).toBeUndefined();
    const root = path.resolve("workspace");
    expect(isWithinWorkspace(path.join(root, "child"), [root])).toBe(true);
    expect(isWithinWorkspace(path.resolve("elsewhere"), [root])).toBe(false);
  });
});
