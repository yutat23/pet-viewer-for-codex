import * as path from "node:path";
import type { PetState } from "../pet/types.js";

export const CODEX_HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "SubagentStart",
  "SubagentStop",
  "Stop"
] as const;

export type CodexHookEventName = typeof CODEX_HOOK_EVENTS[number];

export interface CodexHookEvent {
  version: 1;
  eventName: CodexHookEventName;
  sessionId: string;
  turnId?: string;
  cwd: string;
  occurredAt: number;
}

export interface HookStateTransition {
  state: PetState;
  sessionId: string;
  settleAfterMs?: number;
}

const EVENT_NAMES = new Set<string>(CODEX_HOOK_EVENTS);
const STATE_PRIORITY: Record<PetState, number> = {
  idle: 0,
  review: 1,
  running: 2,
  waiting: 3,
  failed: 4
};

export function parseCodexHookEvent(value: unknown): CodexHookEvent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const event = value as Record<string, unknown>;
  if (
    event.version !== 1 ||
    typeof event.eventName !== "string" ||
    !EVENT_NAMES.has(event.eventName) ||
    typeof event.sessionId !== "string" ||
    event.sessionId.length === 0 ||
    typeof event.cwd !== "string" ||
    event.cwd.length === 0 ||
    typeof event.occurredAt !== "number" ||
    !Number.isFinite(event.occurredAt) ||
    (event.turnId !== undefined && typeof event.turnId !== "string")
  ) {
    return undefined;
  }
  return event as unknown as CodexHookEvent;
}

export function isWithinWorkspace(cwd: string, workspaceRoots: readonly string[]): boolean {
  const candidate = path.resolve(cwd);
  return workspaceRoots.some((root) => {
    const relative = path.relative(path.resolve(root), candidate);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
}

export class HookEventStateTracker {
  private readonly sessions = new Map<string, PetState>();

  public handle(event: CodexHookEvent): HookStateTransition {
    let state: PetState;
    let settleAfterMs: number | undefined;
    switch (event.eventName) {
      case "SessionStart":
        state = "idle";
        break;
      case "PermissionRequest":
        state = "waiting";
        break;
      case "Stop":
        state = "review";
        settleAfterMs = 3000;
        break;
      default:
        state = "running";
        break;
    }
    this.sessions.set(event.sessionId, state);
    return { state: this.aggregate(), sessionId: event.sessionId, settleAfterMs };
  }

  public settle(sessionId: string): PetState {
    if (this.sessions.has(sessionId)) this.sessions.set(sessionId, "idle");
    return this.aggregate();
  }

  public reset(): void {
    this.sessions.clear();
  }

  private aggregate(): PetState {
    let aggregate: PetState = "idle";
    for (const state of this.sessions.values()) {
      if (STATE_PRIORITY[state] > STATE_PRIORITY[aggregate]) aggregate = state;
    }
    return aggregate;
  }
}
