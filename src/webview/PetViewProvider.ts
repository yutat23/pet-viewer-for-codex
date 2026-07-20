import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import { PetRepository } from "../pet/PetRepository.js";
import { PetStateMachine } from "../pet/PetStateMachine.js";
import type { PetState } from "../pet/types.js";
import type { ExtensionToWebviewMessage, PetViewModel } from "./messages.js";
import { isWebviewMessage } from "./messages.js";
import { getWebviewHtml } from "./getWebviewHtml.js";

export class PetViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codexPet.panelView";
  private view: vscode.WebviewView | undefined;
  private previewPanel: vscode.WebviewPanel | undefined;
  private displayOptions = {
    enabled: true,
    scale: 0.75,
    animationSpeed: 1,
    pauseWhenHidden: true
  };
  private readonly stateMachine = new PetStateMachine();
  private readonly petChangeEmitter = new vscode.EventEmitter<
    { petName: string; state: PetState } | undefined
  >();
  public readonly onDidChangePet = this.petChangeEmitter.event;
  private readonly selectionEmitter = new vscode.EventEmitter<string>();
  public readonly onDidSelectPet = this.selectionEmitter.event;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly petsDirectory: string,
    private readonly repository: PetRepository,
    private readonly log: (message: string) => void
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.configureWebview(webviewView.webview);
  }

  public setDisplayOptions(options: typeof this.displayOptions): void {
    this.displayOptions = options;
    void this.render();
  }

  public async openPreview(): Promise<void> {
    if (this.previewPanel) {
      this.previewPanel.reveal(vscode.ViewColumn.Beside);
      await this.render();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "codexPet.preview",
      "Codex Pet Preview",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [this.extensionUri, vscode.Uri.file(this.petsDirectory)] }
    );
    this.previewPanel = panel;
    this.configureWebview(panel.webview);
    panel.onDidDispose(() => {
      if (this.previewPanel === panel) {
        this.previewPanel = undefined;
      }
    });
  }

  private configureWebview(webview: vscode.Webview): void {
    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri, vscode.Uri.file(this.petsDirectory)]
    };
    webview.html = getWebviewHtml(webview);
    webview.onDidReceiveMessage((message: unknown) => this.handleMessage(message));
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isWebviewMessage(message)) {
      return;
    }
    if (message.type === "ready") {
      await this.refresh();
    } else if (
      message.type === "animationComplete" &&
      message.state === this.stateMachine.state
    ) {
      const animation = this.repository.selectedPet?.animations[message.state];
      if (animation && this.stateMachine.completeAnimation(animation)) {
        this.log("Non-looping animation completed; state returned to idle.");
        await this.render();
      }
    }
  }

  public async refresh(): Promise<void> {
    try {
      const result = await this.repository.refresh();
      this.log(`Found ${result.pets.length} Pet(s).`);
      for (const issue of result.issues) {
        this.log(`Skipped ${issue.directoryName}: ${issue.message}`);
      }
      if (result.pets.length === 0 && result.issues.length > 0) {
        await this.post({
          type: "showError",
          message: `No Pet could be loaded. ${result.issues[0]?.directoryName}: ${result.issues[0]?.message}`
        });
        this.petChangeEmitter.fire(undefined);
        return;
      }
      await this.render();
    } catch (error) {
      await this.post({ type: "showError", message: error instanceof Error ? error.message : String(error) });
    }
  }

  public async selectPet(): Promise<void> {
    const result = this.repository.loadResult ?? (await this.repository.refresh());
    if (result.pets.length === 0) {
      await this.render();
      void vscode.window.showInformationMessage("No Codex Pets were found.");
      return;
    }

    const selected = await vscode.window.showQuickPick(
      result.pets.map((pet) => ({ label: pet.name, description: pet.description, petId: pet.id })),
      { title: "Select a Codex Pet", placeHolder: "Choose the Pet shown in the side bar" }
    );
    if (selected && this.repository.select(selected.petId)) {
      this.log(`Selected Pet: ${selected.label}`);
      this.selectionEmitter.fire(selected.petId);
      await this.render();
    }
  }

  public async setState(state: PetState): Promise<void> {
    if (!this.repository.loadResult) {
      await this.repository.refresh();
    }
    const selected = this.repository.selectedPet;
    if (!selected) {
      void vscode.window.showInformationMessage("No Codex Pet is available.");
      return;
    }
    if (!selected.animations[state]) {
      void vscode.window.showWarningMessage(`${selected.name} does not define a ${state} animation.`);
      return;
    }
    this.stateMachine.setState(state);
    this.log(`State changed to ${state}.`);
    await this.render();
  }

  private async render(): Promise<void> {
    if (!this.displayOptions.enabled) {
      this.petChangeEmitter.fire(undefined);
      await this.post({ type: "showDisabled" });
      return;
    }
    const result = this.repository.loadResult;
    const selected = this.repository.selectedPet;
    if (!result || !selected) {
      this.petChangeEmitter.fire(undefined);
      await this.post({
        type: "showEmpty",
        petsDirectory: result?.petsDirectory ?? this.petsDirectory,
        directoryExists: result?.directoryExists ?? false
      });
      return;
    }

    const state = this.stateMachine.state;
    const animation = selected.animations[state] ?? selected.animations.idle;
    if (!animation) {
      await this.post({ type: "showError", message: `This Pet has no valid ${state} animation.` });
      return;
    }
    const modifiedAt = await fs.stat(selected.spriteSheetPath).then((stat) => stat.mtimeMs).catch(() => Date.now());
    this.petChangeEmitter.fire({ petName: selected.name, state });
    const fileUri = vscode.Uri.file(selected.spriteSheetPath).with({ query: `v=${modifiedAt}` });
    await Promise.all(this.webviews().map(async (webview) => {
      const pet: PetViewModel = {
        id: selected.id,
        name: selected.name,
        description: selected.description,
        spriteUri: webview.asWebviewUri(fileUri).toString(),
        columns: selected.columns,
        rows: selected.rows,
        frameWidth: selected.frameWidth,
        frameHeight: selected.frameHeight,
        state,
        animation,
        scale: this.displayOptions.scale,
        animationSpeed: this.displayOptions.animationSpeed,
        pauseWhenHidden: this.displayOptions.pauseWhenHidden
      };
      await webview.postMessage({ type: "showPet", pet } satisfies ExtensionToWebviewMessage);
    }));
  }

  private async post(message: ExtensionToWebviewMessage): Promise<void> {
    await Promise.all(this.webviews().map((webview) => webview.postMessage(message)));
  }

  private webviews(): vscode.Webview[] {
    return [this.view?.webview, this.previewPanel?.webview].filter(
      (webview): webview is vscode.Webview => webview !== undefined
    );
  }
}
