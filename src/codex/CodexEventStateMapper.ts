import type { PetState } from "../pet/types.js";

export interface AppServerMessage {
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
}

export interface StateTransition {
  state: PetState;
  settleAfterMs?: number;
}

const APPROVAL_METHODS = new Set([
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
  "item/permissions/requestApproval",
  "mcpServer/elicitation/request",
  "execCommandApproval",
  "applyPatchApproval"
]);

export class CodexEventStateMapper {
  private readonly activeTurns = new Set<string>();
  private readonly approvalRequests = new Set<string>();
  private holdingTerminalState = false;

  public handle(message: AppServerMessage): StateTransition | undefined {
    const method = message.method;
    if (!method) {
      return undefined;
    }
    if (APPROVAL_METHODS.has(method) && message.id !== undefined) {
      this.approvalRequests.add(String(message.id));
      return { state: "waiting" };
    }

    switch (method) {
      case "turn/started": {
        this.holdingTerminalState = false;
        const key = turnKey(message.params);
        if (key) {
          this.activeTurns.add(key);
        }
        return { state: "running" };
      }
      case "serverRequest/resolved": {
        const requestId = message.params?.requestId;
        if (typeof requestId === "string" || typeof requestId === "number") {
          this.approvalRequests.delete(String(requestId));
        } else {
          this.approvalRequests.clear();
        }
        return { state: this.activeTurns.size > 0 ? "running" : "idle" };
      }
      case "turn/completed": {
        const key = turnKey(message.params);
        if (key) {
          this.activeTurns.delete(key);
        }
        this.approvalRequests.clear();
        const status = turnStatus(message.params);
        if (status === "failed") {
          this.holdingTerminalState = true;
          return { state: "failed", settleAfterMs: 5000 };
        }
        if (status === "interrupted") {
          return { state: "idle" };
        }
        this.holdingTerminalState = true;
        return { state: "review", settleAfterMs: 3000 };
      }
      case "error":
        if (message.params?.willRetry === true) {
          this.holdingTerminalState = false;
          return { state: "running" };
        }
        this.holdingTerminalState = true;
        return { state: "failed", settleAfterMs: 5000 };
      case "thread/status/changed": {
        const status = message.params?.status;
        const type = status && typeof status === "object"
          ? (status as Record<string, unknown>).type
          : undefined;
        if (type === "systemError") {
          return { state: "failed", settleAfterMs: 5000 };
        }
        if (type === "active") {
          return { state: this.approvalRequests.size > 0 ? "waiting" : "running" };
        }
        if (type === "idle" && this.activeTurns.size === 0 && !this.holdingTerminalState) {
          return { state: "idle" };
        }
        return undefined;
      }
      default:
        return undefined;
    }
  }

  public settle(): PetState {
    this.holdingTerminalState = false;
    if (this.approvalRequests.size > 0) {
      return "waiting";
    }
    return this.activeTurns.size > 0 ? "running" : "idle";
  }

  public reset(): void {
    this.activeTurns.clear();
    this.approvalRequests.clear();
    this.holdingTerminalState = false;
  }
}

function turnKey(params: Record<string, unknown> | undefined): string | undefined {
  const threadId = params?.threadId;
  const turn = params?.turn;
  const turnId = turn && typeof turn === "object"
    ? (turn as Record<string, unknown>).id
    : undefined;
  return typeof threadId === "string" && typeof turnId === "string"
    ? `${threadId}:${turnId}`
    : undefined;
}

function turnStatus(params: Record<string, unknown> | undefined): string | undefined {
  const turn = params?.turn;
  return turn && typeof turn === "object"
    ? String((turn as Record<string, unknown>).status ?? "")
    : undefined;
}
