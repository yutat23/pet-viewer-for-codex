import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HookInstaller } from "../src/codex/HookInstaller.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    fs.rm(directory, { recursive: true, force: true })
  ));
});

describe("HookInstaller", () => {
  it("detects installation, preserves existing hooks, and cleans up its script", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-pet-installer-"));
    temporaryDirectories.push(root);
    const bundledScript = path.join(root, "bundled.cjs");
    await fs.writeFile(bundledScript, "process.stdin.resume();\n", "utf8");
    await fs.writeFile(
      path.join(root, "hooks.json"),
      JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "existing" }] }] } }),
      "utf8"
    );
    const installer = new HookInstaller(root, bundledScript);

    expect(await installer.isInstalled()).toBe(false);
    await installer.install();
    expect(await installer.isInstalled()).toBe(true);
    const installed = JSON.parse(await fs.readFile(installer.hooksPath, "utf8"));
    expect(installed.hooks.Stop).toHaveLength(2);

    await installer.uninstall();
    expect(await installer.isInstalled()).toBe(false);
    await expect(fs.access(installer.scriptPath)).rejects.toMatchObject({ code: "ENOENT" });
    const removed = JSON.parse(await fs.readFile(installer.hooksPath, "utf8"));
    expect(removed.hooks.Stop).toEqual([
      { hooks: [{ type: "command", command: "existing" }] }
    ]);
  });
});
