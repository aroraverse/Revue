import type { BusinessType } from "./types";

/**
 * Tick-box tags shown after the star selector, per business type.
 * Keep each list short (6) so it fits a 390px screen without scrolling.
 */
export const TAGS_BY_TYPE: Record<BusinessType, string[]> = {
  restaurant: [
    "Friendly staff",
    "Tasty food",
    "Clean space",
    "Quick service",
    "Good value",
    "Great ambience",
  ],
  cafe: [
    "Great coffee",
    "Cozy spot",
    "Friendly staff",
    "Fast service",
    "Good value",
    "Nice music",
  ],
  salon: [
    "Skilled stylist",
    "Friendly staff",
    "Clean space",
    "On-time service",
    "Great result",
    "Relaxing vibe",
  ],
  clinic: [
    "Caring staff",
    "Short wait",
    "Clean facility",
    "Clear explanation",
    "Easy booking",
    "Felt comfortable",
  ],
  retail: [
    "Helpful staff",
    "Great selection",
    "Fair prices",
    "Clean store",
    "Quick checkout",
    "Found what I needed",
  ],
  other: [
    "Friendly staff",
    "Great service",
    "Clean space",
    "Quick and easy",
    "Good value",
    "Would return",
  ],
};

export function tagsForType(type: BusinessType): string[] {
  return TAGS_BY_TYPE[type] ?? TAGS_BY_TYPE.other;
}
