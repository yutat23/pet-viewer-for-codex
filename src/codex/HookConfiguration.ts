export const INSTALLED_HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PermissionRequest",
  "PostToolUse",
  "Stop"
] as const;

type JsonObject = Record<string, unknown>;

export function hookCommand(scriptPath: string): string {
  return `node "${scriptPath.replaceAll('"', '\\"')}"`;
}

export function mergeCodexPetHooks(configuration: unknown, command: string): JsonObject {
  const root = isObject(configuration) ? structuredClone(configuration) : {};
  const hooks = isObject(root.hooks) ? root.hooks : {};
  root.hooks = hooks;
  for (const eventName of INSTALLED_HOOK_EVENTS) {
    const groups = Array.isArray(hooks[eventName]) ? hooks[eventName] as unknown[] : [];
    const withoutOldEntries = removeCommandFromGroups(groups, command);
    withoutOldEntries.push({
      ...(eventName === "SessionStart" ? { matcher: "startup|resume|clear" } : {}),
      hooks: [{ type: "command", command, commandWindows: command, timeout: 5 }]
    });
    hooks[eventName] = withoutOldEntries;
  }
  return root;
}

export function removeCodexPetHooks(configuration: unknown, command: string): JsonObject {
  const root = isObject(configuration) ? structuredClone(configuration) : {};
  if (!isObject(root.hooks)) return root;
  for (const [eventName, groups] of Object.entries(root.hooks)) {
    if (!Array.isArray(groups)) continue;
    root.hooks[eventName] = removeCommandFromGroups(groups, command);
  }
  return root;
}

function removeCommandFromGroups(groups: unknown[], command: string): unknown[] {
  const result: unknown[] = [];
  for (const groupValue of groups) {
    if (!isObject(groupValue) || !Array.isArray(groupValue.hooks)) {
      result.push(groupValue);
      continue;
    }
    const handlers = groupValue.hooks.filter((handler) =>
      !isObject(handler) || (handler.command !== command && handler.commandWindows !== command)
    );
    if (handlers.length > 0) result.push({ ...groupValue, hooks: handlers });
  }
  return result;
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
