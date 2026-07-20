import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as readline from "node:readline";
import type { PetState } from "../pet/types.js";
import { CodexEventStateMapper, type AppServerMessage } from "./CodexEventStateMapper.js";

export type AppServerConnectionState = "stopped" | "starting" | "connected" | "error";

export interface AppServerClientOptions {
  executable: string;
  cwd?: string;
  log: (message: string) => void;
  onPetState: (state: PetState) => void;
  onConnectionState: (state: AppServerConnectionState) => void;
}

export class AppServerClient {
  private process: ChildProcessWithoutNullStreams | undefined;
  private readonly mapper = new CodexEventStateMapper();
  private settleTimer: NodeJS.Timeout | undefined;
  private stopping = false;

  public constructor(private readonly options: AppServerClientOptions) {}

  public start(): void {
    if (this.process) {
      return;
    }
    this.stopping = false;
    if (process.platform === "win32" && /[&|<>^%!`"\r\n]/.test(this.options.executable)) {
      this.options.log("App Server executable contains unsupported Windows shell characters.");
      this.options.onConnectionState("error");
      this.options.onPetState("failed");
      return;
    }
    this.options.onConnectionState("starting");
    this.options.log(`Starting managed App Server: ${this.options.executable}`);
    const child = spawn(
      this.options.executable,
      ["app-server", "--listen", "stdio://"],
      {
        cwd: this.options.cwd,
        env: process.env,
        shell: process.platform === "win32",
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      }
    );
    this.process = child;
    const output = readline.createInterface({ input: child.stdout });
    const errors = readline.createInterface({ input: child.stderr });
    output.on("line", (line) => this.handleLine(line));
    errors.on("line", (line) => this.options.log(`App Server: ${line}`));
    child.on("error", (error) => {
      this.options.log(`App Server failed to start: ${error.message}`);
      this.options.onConnectionState("error");
      this.options.onPetState("failed");
    });
    child.on("exit", (code, signal) => {
      output.close();
      errors.close();
      this.process = undefined;
      this.clearSettleTimer();
      this.mapper.reset();
      this.options.log(`App Server exited (code=${code ?? "none"}, signal=${signal ?? "none"}).`);
      this.options.onConnectionState(this.stopping ? "stopped" : "error");
      this.options.onPetState(this.stopping ? "idle" : "failed");
      this.stopping = false;
    });
    this.send({
      method: "initialize",
      id: 1,
      params: {
        clientInfo: {
          name: "codex_pet_viewer",
          title: "Pet Viewer for Codex",
          version: "0.4.0"
        }
      }
    });
  }

  public stop(): void {
    if (!this.process) {
      this.options.onConnectionState("stopped");
      return;
    }
    this.stopping = true;
    this.options.log("Stopping managed App Server.");
    this.process.kill();
  }

  public dispose(): void {
    this.stop();
  }

  private handleLine(line: string): void {
    let message: AppServerMessage;
    try {
      message = JSON.parse(line) as AppServerMessage;
    } catch {
      this.options.log(`Ignored non-JSON App Server output: ${line.slice(0, 200)}`);
      return;
    }
    if (message.id === 1 && message.result !== undefined) {
      this.send({ method: "initialized", params: {} });
      this.options.onConnectionState("connected");
      this.options.log("Managed App Server initialized.");
      return;
    }
    if (message.id === 1 && message.error !== undefined) {
      this.options.onConnectionState("error");
      this.options.onPetState("failed");
      this.options.log(`App Server initialization failed: ${JSON.stringify(message.error)}`);
      return;
    }

    const transition = this.mapper.handle(message);
    if (!transition) {
      return;
    }
    this.clearSettleTimer();
    this.options.onPetState(transition.state);
    this.options.log(`App Server event ${message.method} -> ${transition.state}`);
    if (transition.settleAfterMs) {
      this.settleTimer = setTimeout(() => {
        this.settleTimer = undefined;
        this.options.onPetState(this.mapper.settle());
      }, transition.settleAfterMs);
    }
  }

  private send(message: unknown): void {
    if (this.process?.stdin.writable) {
      this.process.stdin.write(`${JSON.stringify(message)}\n`);
    }
  }

  private clearSettleTimer(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = undefined;
    }
  }
}
