"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MAX_INPUT_BYTES = 1024 * 1024;
const ALLOWED_EVENTS = new Set([
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
]);

let size = 0;
const chunks = [];
process.stdin.on("data", (chunk) => {
  size += chunk.length;
  if (size > MAX_INPUT_BYTES) {
    process.exitCode = 1;
    process.stdin.destroy();
    return;
  }
  chunks.push(chunk);
});

process.stdin.on("end", () => {
  if (process.exitCode) return;
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const eventName = stringValue(input.hook_event_name, 64);
    const sessionId = stringValue(input.session_id, 256);
    const cwd = stringValue(input.cwd, 8192);
    if (!eventName || !ALLOWED_EVENTS.has(eventName) || !sessionId || !cwd) {
      process.exitCode = 1;
      return;
    }

    const codexHome = process.env.CODEX_HOME?.trim()
      ? path.resolve(process.env.CODEX_HOME.trim())
      : path.join(os.homedir(), ".codex");
    const eventDirectory = process.env.CODEX_PET_EVENT_DIR?.trim()
      ? path.resolve(process.env.CODEX_PET_EVENT_DIR.trim())
      : path.join(codexHome, "codex-pet", "events");
    fs.mkdirSync(eventDirectory, { recursive: true });

    const event = {
      version: 1,
      eventName,
      sessionId,
      cwd,
      occurredAt: Date.now()
    };
    const turnId = stringValue(input.turn_id, 256);
    if (turnId) event.turnId = turnId;

    const stem = `${Date.now()}-${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
    const temporaryPath = path.join(eventDirectory, `${stem}.tmp`);
    const finalPath = path.join(eventDirectory, `${stem}.json`);
    fs.writeFileSync(temporaryPath, JSON.stringify(event), { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporaryPath, finalPath);
  } catch {
    process.exitCode = 1;
  }
});

function stringValue(value, maximumLength) {
  return typeof value === "string" && value.length > 0 && value.length <= maximumLength
    ? value
    : undefined;
}
