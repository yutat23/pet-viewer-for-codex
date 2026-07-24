import type { UiStrings } from "../localization.js";

export const PET_BACKGROUND_IDS = [
  "none", "arcade", "autumn-forest", "blue-sky", "office", "pro-office",
  "grassland", "japanese-festival", "japanese-room", "living-room", "night-camp",
  "night-city", "space", "rainy-cafe", "treehouse", "server-room", "snowy-cabin",
  "sunset", "terminal", "tropical-beach", "underwater"
] as const;

export type PetBackgroundId = (typeof PET_BACKGROUND_IDS)[number];

export function isPetBackgroundId(value: unknown): value is PetBackgroundId {
  return PET_BACKGROUND_IDS.some((id) => id === value);
}

export function petBackgroundsForDisplay(strings: UiStrings): Array<{
  id: PetBackgroundId;
  label: string;
  description: string;
}> {
  const backgrounds = PET_BACKGROUND_IDS.map((id) => {
    const [label, description] = strings.backgroundDescriptions[id] ?? [id, id];
    return { id, label, description };
  });
  const [none, ...scenes] = backgrounds;
  return [none!, ...scenes.sort((left, right) =>
    left.label.localeCompare(right.label, strings.languageTag)
  )];
}
