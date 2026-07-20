import { describe, expect, it } from "vitest";
import { CodexEventStateMapper } from "../src/codex/CodexEventStateMapper.js";

describe("CodexEventStateMapper", () => {
  it("maps a successful turn lifecycle", () => {
    const mapper = new CodexEventStateMapper();
    expect(mapper.handle(turn("turn/started", "inProgress"))).toEqual({ state: "running" });
    expect(mapper.handle(turn("turn/completed", "completed"))).toEqual({
      state: "review",
      settleAfterMs: 3000
    });
    expect(mapper.handle({
      method: "thread/status/changed",
      params: { status: { type: "idle" } }
    })).toBeUndefined();
    expect(mapper.settle()).toBe("idle");
  });

  it("maps approval requests and their resolution", () => {
    const mapper = new CodexEventStateMapper();
    mapper.handle(turn("turn/started", "inProgress"));
    expect(mapper.handle({
      id: 42,
      method: "item/commandExecution/requestApproval",
      params: {}
    })).toEqual({ state: "waiting" });
    expect(mapper.handle({
      method: "serverRequest/resolved",
      params: { requestId: 42 }
    })).toEqual({ state: "running" });
  });

  it("maps failed and interrupted turns", () => {
    const failed = new CodexEventStateMapper();
    failed.handle(turn("turn/started", "inProgress"));
    expect(failed.handle(turn("turn/completed", "failed"))).toEqual({
      state: "failed",
      settleAfterMs: 5000
    });

    const interrupted = new CodexEventStateMapper();
    interrupted.handle(turn("turn/started", "inProgress"));
    expect(interrupted.handle(turn("turn/completed", "interrupted"))).toEqual({ state: "idle" });
  });

  it("distinguishes retrying and terminal errors", () => {
    const mapper = new CodexEventStateMapper();
    expect(mapper.handle({ method: "error", params: { willRetry: true } })).toEqual({ state: "running" });
    expect(mapper.handle({ method: "error", params: { willRetry: false } })).toEqual({
      state: "failed",
      settleAfterMs: 5000
    });
  });
});

function turn(method: "turn/started" | "turn/completed", status: string) {
  return {
    method,
    params: {
      threadId: "thread-1",
      turn: { id: "turn-1", status }
    }
  };
}
