export interface AnimationSpeedOption {
  readonly value: number;
  readonly label: string;
  readonly description: string;
}

export const ANIMATION_SPEEDS: readonly AnimationSpeedOption[] = [
  { value: 0.25, label: "0.25x", description: "Very slow" },
  { value: 0.5, label: "0.5x", description: "Slow" },
  { value: 0.75, label: "0.75x", description: "Relaxed" },
  { value: 1, label: "1x", description: "Normal" },
  { value: 1.25, label: "1.25x", description: "Fast" },
  { value: 1.5, label: "1.5x", description: "Faster" },
  { value: 2, label: "2x", description: "Very fast" },
  { value: 3, label: "3x", description: "Maximum" }
];
