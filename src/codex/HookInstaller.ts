import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  hasCodexPetHooks,
  hookCommand,
  mergeCodexPetHooks,
  removeCodexPetHooks
} from "./HookConfiguration.js";

export const SCRIPT_RELATIVE_PATH = path.join("codex-pet", "bin", "hook.cjs");

export interface HookInstallResult {
  hooksPath: string;
  scriptPath: string;
  command: string;
}

export class HookInstaller {
  public constructor(
    private readonly codexHome: string,
    private readonly bundledScriptPath: string
  ) {}

  public get hooksPath(): string {
    return path.join(this.codexHome, "hooks.json");
  }

  public get scriptPath(): string {
    return path.join(this.codexHome, SCRIPT_RELATIVE_PATH);
  }

  public async isInstalled(): Promise<boolean> {
    const existing = await readConfiguration(this.hooksPath);
    if (!hasCodexPetHooks(existing, hookCommand(this.scriptPath))) return false;
    try {
      await fs.access(this.scriptPath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  public async install(): Promise<HookInstallResult> {
    const hooksPath = this.hooksPath;
    const installedScriptPath = this.scriptPath;
    await fs.mkdir(path.dirname(installedScriptPath), { recursive: true });
    await fs.copyFile(this.bundledScriptPath, installedScriptPath);
    const command = hookCommand(installedScriptPath);
    const existing = await readConfiguration(hooksPath);
    await atomicWriteJson(hooksPath, mergeCodexPetHooks(existing, command));
    return { hooksPath, scriptPath: installedScriptPath, command };
  }

  public async uninstall(): Promise<HookInstallResult> {
    const hooksPath = this.hooksPath;
    const installedScriptPath = this.scriptPath;
    const command = hookCommand(installedScriptPath);
    const existing = await readConfiguration(hooksPath);
    await atomicWriteJson(hooksPath, removeCodexPetHooks(existing, command));
    await fs.unlink(installedScriptPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return { hooksPath, scriptPath: installedScriptPath, command };
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
