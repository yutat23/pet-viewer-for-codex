import * as path from "node:path";
import * as vscode from "vscode";
import { AppServerClient } from "./codex/AppServerClient.js";
import { HookEventReceiver } from "./codex/HookEventReceiver.js";
import { HookInstaller } from "./codex/HookInstaller.js";
import { getStrings } from "./localization.js";
import { getCodexHome, getPetsDirectory } from "./pet/codexHome.js";
import { PetLoader } from "./pet/PetLoader.js";
import { PetRepository } from "./pet/PetRepository.js";
import type { PetState } from "./pet/types.js";
import { PetViewProvider } from "./webview/PetViewProvider.js";
import {
  isPetBackgroundSelection,
  type PetBackgroundSelection
} from "./webview/backgrounds.js";
import { normalizeBackgroundOpacity } from "./webview/customBackground.js";
import { normalizePetScale, type PetScale } from "./webview/petSizes.js";

const SELECTED_PET_KEY = "codexPet.selectedPet";

export function activate(context: vscode.ExtensionContext): void {
  const strings = getStrings(vscode.env.language);
  const codexHome = getCodexHome();
  const initialConfiguration = vscode.workspace.getConfiguration("codexPet");
  const configuredPetDirectory = initialConfiguration.get<string>("petDirectory", "").trim();
  const petsDirectory = configuredPetDirectory
    ? path.resolve(configuredPetDirectory)
    : getPetsDirectory();
  const output = vscode.window.createOutputChannel(strings.appName);
  const log = (message: string): void => {
    output.appendLine(`[${new Date().toISOString()}] ${message}`);
  };
  log(`CODEX_HOME: ${codexHome}`);
  log(`Pets directory: ${petsDirectory}`);

  const savedPetId = context.globalState.get<string>(SELECTED_PET_KEY);
  const repository = new PetRepository(new PetLoader(petsDirectory), savedPetId);
  const hookInstaller = new HookInstaller(
    codexHome,
    context.asAbsolutePath(path.join("scripts", "codex-pet-hook.cjs"))
  );
  let hookEventObserved = false;
  let provider: PetViewProvider;
  const showHooksHelp = async (): Promise<void> => {
    const choice = await vscode.window.showInformationMessage(
      strings.hooks.helpMessage,
      strings.hooks.openConfiguration
    );
    if (choice === strings.hooks.openConfiguration) {
      await vscode.window.showTextDocument(vscode.Uri.file(hookInstaller.hooksPath));
    }
  };
  const setupHooks = async (): Promise<void> => {
    const choice = await vscode.window.showWarningMessage(
      strings.hooks.confirmTitle,
      { modal: true, detail: strings.hooks.confirmMessage(hookInstaller.hooksPath, hookInstaller.scriptPath) },
      strings.hooks.enable
    );
    if (choice !== strings.hooks.enable) return;
    try {
      hookEventObserved = false;
      const result = await hookInstaller.install();
      log(`Installed Pet Viewer for Codex hooks in ${result.hooksPath}`);
      await vscode.workspace.getConfiguration("codexPet").update(
        "integrationMode",
        "hooks",
        vscode.ConfigurationTarget.Global
      );
      await provider.setHookIntegrationState("awaitingTrust");
      const next = await vscode.window.showInformationMessage(
        strings.hooks.installedMessage,
        strings.hooks.openConfiguration
      );
      if (next === strings.hooks.openConfiguration) {
        await vscode.window.showTextDocument(vscode.Uri.file(result.hooksPath));
      }
    } catch (error) {
      log(`Could not install Pet Viewer for Codex hooks: ${String(error)}`);
      void vscode.window.showErrorMessage(
        strings.notifications.hooksInstallFailed(
          strings.translateError(error instanceof Error ? error.message : String(error))
        )
      );
    }
  };
  provider = new PetViewProvider(
    context.extensionUri,
    petsDirectory,
    repository,
    log,
    strings,
    { setupHooks, showHooksHelp }
  );
  provider.setDisplayOptions(readDisplayOptions());
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 20);
  status.name = strings.appName;
  status.text = `$(loading~spin) ${strings.appName}`;
  status.tooltip = strings.statusLoading;
  status.command = "codexPet.focusPet";
  status.show();
  let appServerClient: AppServerClient | undefined;
  let hookEventReceiver: HookEventReceiver | undefined;
  const refreshHookIntegrationStatus = async (): Promise<void> => {
    try {
      const installed = await hookInstaller.isInstalled();
      const hooksMode = vscode.workspace.getConfiguration("codexPet").get<string>(
        "integrationMode",
        "manual"
      ) === "hooks";
      await provider.setHookIntegrationState(
        installed && hooksMode
          ? hookEventObserved ? "active" : "awaitingTrust"
          : "notConfigured"
      );
    } catch (error) {
      log(`Could not inspect Pet Viewer for Codex hooks: ${String(error)}`);
      await provider.setHookIntegrationState("notConfigured");
    }
  };
  void refreshHookIntegrationStatus();

  const startAppServer = (): void => {
    if (appServerClient) {
      appServerClient.start();
      return;
    }
    const configuration = vscode.workspace.getConfiguration("codexPet");
    const executable = configuration.get<string>("appServer.executable", "codex").trim() || "codex";
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    appServerClient = new AppServerClient({
      executable,
      clientTitle: strings.appName,
      cwd,
      log,
      onPetState: (state) => void provider.setState(state),
      onConnectionState: (state) => {
        log(`App Server connection state: ${state}`);
        if (state === "connected") {
          void vscode.window.setStatusBarMessage(strings.notifications.appServerConnected, 3000);
        } else if (state === "error") {
          void vscode.window.showWarningMessage(
            strings.notifications.appServerConnectionFailed
          );
        }
      }
    });
    appServerClient.start();
  };
  const stopAppServer = (): void => {
    appServerClient?.stop();
  };
  const restartAppServer = (): void => {
    appServerClient?.dispose();
    appServerClient = undefined;
    startAppServer();
  };
  const startHookReceiver = async (): Promise<void> => {
    if (hookEventReceiver) return;
    const workspaceRoots = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? [];
    if (workspaceRoots.length === 0) {
      log("Codex Hooks integration is waiting for a workspace folder.");
      return;
    }
    hookEventReceiver = new HookEventReceiver({
      eventDirectory: path.join(codexHome, "codex-pet", "events"),
      workspaceRoots,
      log,
      onPetState: (state) => void provider.setState(state),
      onEventReceived: () => {
        hookEventObserved = true;
        void provider.setHookIntegrationState("active");
      }
    });
    try {
      await hookEventReceiver.start();
    } catch (error) {
      hookEventReceiver.dispose();
      hookEventReceiver = undefined;
      log(`Could not start Codex Hooks receiver: ${String(error)}`);
      void vscode.window.showWarningMessage(
        strings.notifications.hooksReceiverFailed
      );
    }
  };
  const stopHookReceiver = (): void => {
    hookEventReceiver?.dispose();
    hookEventReceiver = undefined;
  };
  const reconcileIntegration = (): void => {
    const configuration = vscode.workspace.getConfiguration("codexPet");
    const mode = configuration.get<string>("integrationMode", "manual");
    const autoStart = configuration.get<boolean>("appServer.autoStart", true);
    if (mode === "appServer" && autoStart) {
      stopHookReceiver();
      startAppServer();
    } else if (mode === "hooks") {
      stopAppServer();
      void startHookReceiver();
    } else {
      stopAppServer();
      stopHookReceiver();
    }
  };

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(petsDirectory), "**/*")
  );
  let refreshTimer: NodeJS.Timeout | undefined;
  const scheduleRefresh = (event: string, uri: vscode.Uri): void => {
    const relative = path.relative(petsDirectory, uri.fsPath);
    log(`File ${event}: ${relative && !relative.startsWith("..") ? relative : path.basename(uri.fsPath)}`);
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      void provider.refresh();
    }, 250);
  };

  const stateCommands: ReadonlyArray<readonly [string, PetState]> = [
    ["codexPet.setIdle", "idle"],
    ["codexPet.setRunning", "running"],
    ["codexPet.setWaiting", "waiting"],
    ["codexPet.setReview", "review"],
    ["codexPet.setFailed", "failed"]
  ];

  context.subscriptions.push(
    output,
    watcher,
    vscode.window.registerWebviewViewProvider(PetViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    vscode.commands.registerCommand("codexPet.selectPet", () => provider.selectPet()),
    vscode.commands.registerCommand("codexPet.selectBackground", () => provider.selectBackground()),
    vscode.commands.registerCommand("codexPet.selectCustomBackground", () =>
      provider.selectCustomBackgroundImage()
    ),
    vscode.commands.registerCommand("codexPet.selectBackgroundOpacity", () =>
      provider.selectCustomBackgroundOpacity()
    ),
    vscode.commands.registerCommand("codexPet.selectAnimationSpeed", () => provider.selectAnimationSpeed()),
    vscode.commands.registerCommand("codexPet.selectSize", () => provider.selectSize()),
    vscode.commands.registerCommand("codexPet.refreshPets", () => provider.refresh()),
    vscode.commands.registerCommand("codexPet.openPetsDirectory", async () => {
      const uri = vscode.Uri.file(petsDirectory);
      await vscode.workspace.fs.createDirectory(uri);
      log("Opened the Pets directory.");
      await vscode.commands.executeCommand("revealFileInOS", uri);
    }),
    vscode.commands.registerCommand("codexPet.previewPet", () => provider.openPreview()),
    vscode.commands.registerCommand("codexPet.startAppServer", startAppServer),
    vscode.commands.registerCommand("codexPet.stopAppServer", stopAppServer),
    vscode.commands.registerCommand("codexPet.restartAppServer", restartAppServer),
    vscode.commands.registerCommand("codexPet.installHooks", async () => {
      await setupHooks();
    }),
    vscode.commands.registerCommand("codexPet.uninstallHooks", async () => {
      try {
        const result = await hookInstaller.uninstall();
        log(`Removed Pet Viewer for Codex hooks from ${result.hooksPath}`);
        stopHookReceiver();
        hookEventObserved = false;
        const configuration = vscode.workspace.getConfiguration("codexPet");
        if (configuration.get<string>("integrationMode") === "hooks") {
          await configuration.update("integrationMode", "manual", vscode.ConfigurationTarget.Global);
        }
        await provider.setHookIntegrationState("notConfigured");
        void vscode.window.showInformationMessage(strings.notifications.hooksRemoved);
      } catch (error) {
        log(`Could not remove Pet Viewer for Codex hooks: ${String(error)}`);
        void vscode.window.showErrorMessage(
          strings.notifications.hooksRemoveFailed(
            strings.translateError(error instanceof Error ? error.message : String(error))
          )
        );
      }
    }),
    vscode.commands.registerCommand("codexPet.openHooksConfiguration", async () => {
      await vscode.window.showTextDocument(vscode.Uri.file(path.join(codexHome, "hooks.json")));
    }),
    vscode.commands.registerCommand("codexPet.focusPet", () =>
      vscode.commands.executeCommand(`${PetViewProvider.viewType}.focus`)
    ),
    ...stateCommands.map(([command, state]) =>
      vscode.commands.registerCommand(command, () => provider.setState(state))
    ),
    provider.onDidSelectPet((petId) => {
      void context.globalState.update(SELECTED_PET_KEY, petId);
    }),
    provider.onDidChangePet((pet) => {
      if (!pet) {
        status.text = `$(warning) ${strings.appName}`;
        status.tooltip = strings.statusNoPet;
        return;
      }
      const icon = statusIcon(pet.state);
      const stateLabel = strings.stateLabels[pet.state];
      status.text = `${icon} ${pet.petName}: ${stateLabel}`;
      status.tooltip = strings.statusShowPet(pet.petName, stateLabel);
    }),
    watcher.onDidCreate((uri) => watchEnabled() && scheduleRefresh("created", uri)),
    watcher.onDidChange((uri) => watchEnabled() && scheduleRefresh("changed", uri)),
    watcher.onDidDelete((uri) => watchEnabled() && scheduleRefresh("deleted", uri)),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("codexPet")) {
        return;
      }
      provider.setDisplayOptions(readDisplayOptions());
      if (event.affectsConfiguration("codexPet.petDirectory")) {
        void vscode.window.showInformationMessage(
          strings.notifications.reloadRequired,
          strings.notifications.reload
        ).then((choice) => {
          if (choice === strings.notifications.reload) {
            void vscode.commands.executeCommand("workbench.action.reloadWindow");
          }
        });
      }
      if (
        event.affectsConfiguration("codexPet.integrationMode") ||
        event.affectsConfiguration("codexPet.appServer.autoStart")
      ) {
        reconcileIntegration();
        void refreshHookIntegrationStatus();
      }
      if (event.affectsConfiguration("codexPet.appServer.executable")) {
        appServerClient?.dispose();
        appServerClient = undefined;
        reconcileIntegration();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (vscode.workspace.getConfiguration("codexPet").get<string>("integrationMode") === "hooks") {
        stopHookReceiver();
        void startHookReceiver();
      }
    }),
    {
      dispose: () => {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
        }
        appServerClient?.dispose();
        hookEventReceiver?.dispose();
      }
    },
    status
  );
  reconcileIntegration();
}

function readDisplayOptions(): {
  enabled: boolean;
  scale: PetScale;
  animationSpeed: number;
  pauseWhenHidden: boolean;
  background: PetBackgroundSelection;
  customBackgroundPath: string;
  customBackgroundOpacity: number;
} {
  const configuration = vscode.workspace.getConfiguration("codexPet");
  const configuredBackground = configuration.get<string>("background", "grassland");
  return {
    enabled: configuration.get<boolean>("enabled", true),
    scale: normalizePetScale(configuration.get<unknown>("scale", 1)),
    animationSpeed: configuration.get<number>("animationSpeed", 1),
    pauseWhenHidden: configuration.get<boolean>("pauseWhenHidden", true),
    background: isPetBackgroundSelection(configuredBackground) ? configuredBackground : "grassland",
    customBackgroundPath: configuration
      .get<string>("customBackground.imagePath", "")
      .trim(),
    customBackgroundOpacity: normalizeBackgroundOpacity(
      configuration.get<unknown>("customBackground.opacity", 1)
    )
  };
}

function watchEnabled(): boolean {
  return vscode.workspace.getConfiguration("codexPet").get<boolean>("watchPetDirectory", true);
}

function statusIcon(state: PetState): string {
  switch (state) {
    case "running":
      return "$(loading~spin)";
    case "waiting":
      return "$(question)";
    case "review":
      return "$(eye)";
    case "failed":
      return "$(error)";
    default:
      return "$(circle-filled)";
  }
}

export function deactivate(): void {}
