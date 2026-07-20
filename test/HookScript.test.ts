import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { parseCodexHookEvent } from "../src/codex/HookEventStateTracker.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("codex-pet-hook", () => {
  it("writes one validated event without stdout", () => {
    const eventDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "codex-pet-hook-"));
    temporaryDirectories.push(eventDirectory);
    const scriptPath = path.resolve("scripts", "codex-pet-hook.cjs");
    const output = execFileSync(process.execPath, [scriptPath], {
      input: JSON.stringify({
        hook_event_name: "PermissionRequest",
        session_id: "session-1",
        turn_id: "turn-1",
        cwd: process.cwd()
      }),
      env: { ...process.env, CODEX_PET_EVENT_DIR: eventDirectory },
      encoding: "utf8"
    });
    expect(output).toBe("");
    const files = fs.readdirSync(eventDirectory);
    expect(files).toHaveLength(1);
    const value = JSON.parse(fs.readFileSync(path.join(eventDirectory, files[0]), "utf8"));
    expect(parseCodexHookEvent(value)?.eventName).toBe("PermissionRequest");
  });
});
