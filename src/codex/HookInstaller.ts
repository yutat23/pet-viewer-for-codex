import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  hookCommand,
  mergeCodexPetHooks,
  removeCodexPetHooks
} from "./HookConfiguration.js";

const SCRIPT_RELATIVE_PATH = path.join("codex-pet", "bin", "hook.cjs");

export interface HookInstallResult {
  hooksPath: string;
  command: string;
}

export class HookInstaller {
  public constructor(
    private readonly codexHome: string,
    private readonly bundledScriptPath: string
  ) {}

  public async install(): Promise<HookInstallResult> {
    const hooksPath = path.join(this.codexHome, "hooks.json");
    const installedScriptPath = path.join(this.codexHome, SCRIPT_RELATIVE_PATH);
    await fs.mkdir(path.dirname(installedScriptPath), { recursive: true });
    await fs.copyFile(this.bundledScriptPath, installedScriptPath);
    const command = hookCommand(installedScriptPath);
    const existing = await readConfiguration(hooksPath);
    await atomicWriteJson(hooksPath, mergeCodexPetHooks(existing, command));
    return { hooksPath, command };
  }

  public async uninstall(): Promise<HookInstallResult> {
    const hooksPath = path.join(this.codexHome, "hooks.json");
    const installedScriptPath = path.join(this.codexHome, SCRIPT_RELATIVE_PATH);
    const command = hookCommand(installedScriptPath);
    const existing = await readConfiguration(hooksPath);
    await atomicWriteJson(hooksPath, removeCodexPetHooks(existing, command));
    await fs.unlink(installedScriptPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return { hooksPath, command };
  }
}

async function readConfiguration(filePath: string): Promise<unknown> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Existing hooks.json must contain a JSON object.");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    if (error instanceof SyntaxError) {
      throw new Error(`Existing hooks.json is not valid JSON: ${error.message}`);
    }
    throw error;
  }
}

async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.codex-pet-${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
}
