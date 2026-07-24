import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import type { UiStrings } from "../localization.js";
import { PetRepository } from "../pet/PetRepository.js";
import { PetStateMachine } from "../pet/PetStateMachine.js";
import type { PetState } from "../pet/types.js";
import type {
  ExtensionToWebviewMessage,
  HookIntegrationState,
  PetViewModel
} from "./messages.js";
import { isWebviewMessage } from "./messages.js";
import { getWebviewHtml } from "./getWebviewHtml.js";
import {
  petBackgroundsForDisplay,
  type PetBackgroundId
} from "./backgrounds.js";
import { animationSpeedsForDisplay } from "./animationSpeeds.js";

export interface PetViewProviderActions {
  setupHooks(): Promise<void>;
  showHooksHelp(): Promise<void>;
}

export class PetViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codexPet.panelView";
  private view: vscode.WebviewView | undefined;
  private previewPanel: vscode.WebviewPanel | undefined;
  private displayOptions = {
    enabled: true,
    scale: 1,
    animationSpeed: 1,
    pauseWhenHidden: true,
    background: "grassland" as PetBackgroundId
  };
  private readonly stateMachine = new PetStateMachine();
  private hookIntegrationState: HookIntegrationState = "notConfigured";
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
    private readonly log: (message: string) => void,
    private readonly strings: UiStrings,
    private readonly actions: PetViewProviderActions
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
      this.strings.previewTitle,
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
    webview.html = getWebviewHtml(webview, this.strings);
    webview.onDidReceiveMessage((message: unknown) => this.handleMessage(message));
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isWebviewMessage(message)) {
      return;
    }
    if (message.type === "ready") {
      await this.refresh();
      await this.post({ type: "setHookIntegration", state: this.hookIntegrationState });
    } else if (message.type === "setupHooks") {
      await this.actions.setupHooks();
    } else if (message.type === "showHooksHelp") {
      await this.actions.showHooksHelp();
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

  public async setHookIntegrationState(state: HookIntegrationState): Promise<void> {
    this.hookIntegrationState = state;
    await this.post({ type: "setHookIntegration", state });
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
          message: `${this.strings.webview.loadFailed} ${result.issues[0]?.directoryName}: ${this.strings.translateError(result.issues[0]?.message ?? "")}`
        });
        this.petChangeEmitter.fire(undefined);
        return;
      }
      await this.render();
    } catch (error) {
      await this.post({
        type: "showError",
        message: this.strings.translateError(error instanceof Error ? error.message : String(error))
      });
    }
  }

  public async selectPet(): Promise<void> {
    const result = this.repository.loadResult ?? (await this.repository.refresh());
    if (result.pets.length === 0) {
      await this.render();
      void vscode.window.showInformationMessage(this.strings.notifications.noPets);
      return;
    }

    const selected = await vscode.window.showQuickPick(
      result.pets.map((pet) => ({ label: pet.name, description: pet.description, petId: pet.id })),
      {
        title: this.strings.quickPick.petTitle,
        placeHolder: this.strings.quickPick.petPlaceholder
      }
    );
    if (selected && this.repository.select(selected.petId)) {
      this.log(`Selected Pet: ${selected.label}`);
      this.selectionEmitter.fire(selected.petId);
      await this.render();
    }
  }

  public async selectBackground(): Promise<void> {
    const selected = await vscode.window.showQuickPick(
      petBackgroundsForDisplay(this.strings).map((background) => ({
        label: background.label,
        description: background.description,
        backgroundId: background.id,
        picked: background.id === this.displayOptions.background
      })),
      {
        title: this.strings.quickPick.backgroundTitle,
        placeHolder: this.strings.quickPick.backgroundPlaceholder
      }
    );
    if (!selected || selected.backgroundId === this.displayOptions.background) {
      return;
    }
    await vscode.workspace.getConfiguration("codexPet").update(
      "background",
      selected.backgroundId,
      vscode.ConfigurationTarget.Global
    );
    this.log(`Selected background: ${selected.label}`);
  }

  public async selectAnimationSpeed(): Promise<void> {
    const selected = await vscode.window.showQuickPick(
      animationSpeedsForDisplay(this.strings).map((speed) => ({
        label: speed.label,
        description: speed.description,
        speed: speed.value,
        picked: speed.value === this.displayOptions.animationSpeed
      })),
      {
        title: this.strings.quickPick.speedTitle,
        placeHolder: this.strings.quickPick.speedPlaceholder
      }
    );
    if (!selected || selected.speed === this.displayOptions.animationSpeed) {
      return;
    }
    await vscode.workspace.getConfiguration("codexPet").update(
      "animationSpeed",
      selected.speed,
      vscode.ConfigurationTarget.Global
    );
    this.log(`Selected animation speed: ${selected.label}`);
  }

  public async setState(state: PetState): Promise<void> {
    if (!this.repository.loadResult) {
      await this.repository.refresh();
    }
    const selected = this.repository.selectedPet;
    if (!selected) {
      void vscode.window.showInformationMessage(this.strings.notifications.noPet);
      return;
    }
    if (!selected.animations[state]) {
      void vscode.window.showWarningMessage(
        this.strings.notifications.missingAnimation(selected.name, this.strings.stateLabels[state])
      );
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
      await this.post({
        type: "showError",
        message: this.strings.notifications.missingAnimation(
          selected.name,
          this.strings.stateLabels[state]
        )
      });
      return;
    }
    const modifiedAt = await fs.stat(selected.spriteSheetPath).then((stat) => stat.mtimeMs).catch(() => Date.now());
    this.petChangeEmitter.fire({ petName: selected.name, state });
    const fileUri = vscode.Uri.file(selected.spriteSheetPath).with({ query: `v=${modifiedAt}` });
    await Promise.all(this.webviews().map(async (webview) => {
      const pet: PetViewModel = {
        id: selected.id,
        name: selected.name,
        animationAriaLabel: this.strings.webview.animationAria(
          selected.name,
          this.strings.stateLabels[state]
        ),
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
        pauseWhenHidden: this.displayOptions.pauseWhenHidden,
        backgroundId: this.displayOptions.background === "none" ? undefined : this.displayOptions.background
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
