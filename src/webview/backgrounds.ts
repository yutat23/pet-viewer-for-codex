export const PET_BACKGROUNDS = [
  { id: "none", label: "None", description: "Use the VS Code theme background" },
  { id: "arcade", label: "Arcade", description: "Colorful cabinets and glowing game screens" },
  { id: "autumn-forest", label: "Autumn Forest", description: "A golden path beneath colorful leaves" },
  { id: "blue-sky", label: "Blue Sky", description: "A dreamy platform above the clouds" },
  { id: "office", label: "Cozy Office", description: "Warm desk, books, and morning light" },
  { id: "pro-office", label: "Engineering Office", description: "A fully equipped modern software studio" },
  { id: "grassland", label: "Grassland", description: "Sunny meadow and distant hills" },
  { id: "japanese-festival", label: "Japanese Festival", description: "Lanterns, food stalls, and distant fireworks" },
  { id: "japanese-room", label: "Japanese Room", description: "Tatami, shoji screens, and a garden view" },
  { id: "living-room", label: "Living Room", description: "Soft rug and a comfortable window seat" },
  { id: "night-camp", label: "Night Camp", description: "Stars, mountains, and a warm campfire" },
  { id: "night-city", label: "Night City", description: "A neon skyline above a rain-wet rooftop" },
  { id: "space", label: "Outer Space", description: "A ringed planet beyond a space platform" },
  { id: "rainy-cafe", label: "Rainy Café", description: "Warm coffee beside a rain-streaked window" },
  { id: "treehouse", label: "Secret Treehouse", description: "A warm hideaway high in the forest canopy" },
  { id: "server-room", label: "Server Room", description: "Cool server racks and blinking status lights" },
  { id: "snowy-cabin", label: "Snowy Cabin", description: "A warm cabin surrounded by falling snow" },
  { id: "sunset", label: "Sunset Overlook", description: "Golden light over mountains and a lake" },
  { id: "terminal", label: "Terminal", description: "Commands typed live in a programmer's terminal" },
  { id: "tropical-beach", label: "Tropical Beach", description: "Palm trees, white sand, and rolling waves" },
  { id: "underwater", label: "Underwater", description: "A bright coral garden beneath the sea" }
] as const;

export type PetBackgroundId = (typeof PET_BACKGROUNDS)[number]["id"];

export function isPetBackgroundId(value: unknown): value is PetBackgroundId {
  return PET_BACKGROUNDS.some((background) => background.id === value);
}

export function petBackgroundsForDisplay(): Array<(typeof PET_BACKGROUNDS)[number]> {
  const [none, ...backgrounds] = PET_BACKGROUNDS;
  return [none, ...backgrounds.sort((left, right) => left.label.localeCompare(right.label, "en"))];
}
