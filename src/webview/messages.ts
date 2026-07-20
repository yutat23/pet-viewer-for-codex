import type { PetState, SpriteAnimation } from "../pet/types.js";

export interface PetViewModel {
  id: string;
  name: string;
  description?: string;
  spriteUri: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  state: PetState;
  animation: SpriteAnimation;
  scale: number;
  animationSpeed: number;
  pauseWhenHidden: boolean;
}

export type ExtensionToWebviewMessage =
  | { type: "showPet"; pet: PetViewModel }
  | { type: "showEmpty"; petsDirectory: string; directoryExists: boolean }
  | { type: "showDisabled" }
  | { type: "showError"; message: string };

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "animationComplete"; state: PetState };

export function isWebviewMessage(value: unknown): value is WebviewToExtensionMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const message = value as { type?: unknown; state?: unknown };
  if (message.type === "ready") {
    return true;
  }
  return message.type === "animationComplete" && isPetState(message.state);
}

export function isPetState(value: unknown): value is PetState {
  return ["idle", "running", "waiting", "review", "failed"].includes(value as PetState);
}
