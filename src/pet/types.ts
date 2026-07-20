export type PetState = "idle" | "running" | "waiting" | "review" | "failed";

export interface SpriteAnimation {
  row: number;
  startColumn: number;
  frameCount: number;
  frameDurationMs: number;
  frameDurationsMs?: readonly number[];
  loop: boolean;
}

export interface CodexPet {
  id: string;
  name: string;
  description?: string;
  directoryPath: string;
  spriteSheetPath: string;
  spriteVersionNumber?: number;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  animations: Partial<Record<PetState, SpriteAnimation>>;
}

export interface PetLoadIssue {
  directoryName: string;
  message: string;
}

export interface PetLoadResult {
  petsDirectory: string;
  pets: CodexPet[];
  issues: PetLoadIssue[];
  directoryExists: boolean;
}
