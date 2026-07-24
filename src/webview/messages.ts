import type { PetState, SpriteAnimation } from "../pet/types.js";
import type { PetScale } from "./petSizes.js";

export type HookIntegrationState = "notConfigured" | "awaitingTrust" | "active";

export interface PetViewModel {
  id: string;
  name: string;
  animationAriaLabel: string;
  wavingAriaLabel: string;
  description?: string;
  spriteUri: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  state: PetState;
  animation: SpriteAnimation;
  wavingAnimation?: SpriteAnimation;
  scale: PetScale;
  animationSpeed: number;
  pauseWhenHidden: boolean;
  backgroundId?: string;
  customBackgroundUri?: string;
  customBackgroundOpacity: number;
}

export type ExtensionToWebviewMessage =
  | { type: "showPet"; pet: PetViewModel }
  | { type: "showEmpty"; petsDirectory: string; directoryExists: boolean }
  | { type: "showDisabled" }
  | { type: "showError"; message: string }
  | { type: "setHookIntegration"; state: HookIntegrationState };

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "animationComplete"; state: PetState }
  | { type: "setupHooks" }
  | { type: "showHooksHelp" }
  | { type: "customBackgroundLoadFailed" };

export function isWebviewMessage(value: unknown): value is WebviewToExtensionMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const message = value as { type?: unknown; state?: unknown };
  if (message.type === "ready") {
    return true;
  }
  if (
    message.type === "setupHooks" ||
    message.type === "showHooksHelp" ||
    message.type === "customBackgroundLoadFailed"
  ) {
    return true;
  }
  return message.type === "animationComplete" && isPetState(message.state);
}

export function isPetState(value: unknown): value is PetState {
  return ["idle", "running", "waiting", "review", "failed"].includes(value as PetState);
}
