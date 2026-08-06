export interface WeightOption {
  grams: number;
  label: string;
  priceInr: number;
}

// ─── Available weight tiers ────────────────────────────────────────────────────
// 250g is a wholesale sample bag; everything above is bulk. This site is
// wholesale-only — there is no 500g/1kg retail tier.
export const WEIGHT_GRAMS = [
  250, 5_000, 10_000, 15_000, 20_000, 25_000, 50_000, 75_000, 100_000,
] as const;

// ─── Per-kg rate at the 5kg tier, by product slug ──────────────────────────────
// PLACEHOLDER PRICING — carried over from the wholesale catalog's own
// placeholder rates (that source explicitly flags them as not-yet-final).
// Replace every value below with a real per-kg rate before go-live.
//
// Where a product has no direct source equivalent, the comment states the
// nearest-analog product/rate substituted in its place.
const RATE_PER_KG_AT_5KG: Record<string, number> = {
  'coorg-arabica': 2050,           // nearest analog: Specialty Grade Black (washed, premium, Coorg overlap)
  'chikmagalur-robusta': 1000,     // direct match: Wholesale 100% Robusta (Chikmagalur/Bababudangiri)
  'wayanad-specialty': 1950,       // nearest analog: Specialty Grade Milk (blend, milk-forward)
  'nilgiri-estate': 2050,          // nearest analog: Specialty Grade Black (washed, premium single-estate)
  'koraput-natural': 2000,         // direct match: Wholesale Naturals Roasted Beans
  'koraput-honey-sundried': 2100,  // direct match: Wholesale Honey Sundried Roasted Beans
  'koraput-washed': 1900,          // direct match: Wholesale Washed Roasted Beans
  'halflong-assam': 1280,          // nearest analog: 70/30 Arabica-Robusta Blend (washed, medium-dark, blend character)
  'chirang-assam': 1000,           // nearest analog: 100% Robusta (varietal match — Robusta commodity pricing)
  'tirap-arunachal': 2100,         // nearest analog: Honey Sundried Koraput top-tier rate (rare micro-lot positioning)
};

// ─── Bulk discount curve ────────────────────────────────────────────────────────
// Percentage off the 5kg rate at each tier. 5/10/25/50/100kg values are exact
// figures carried over from the source wholesale catalog; 15/20/75kg are
// linearly interpolated between their nearest known neighbours.
const DISCOUNT_BY_KG: Record<number, number> = {
  5: 0,
  10: 0.02,
  15: 0.02 + ((15 - 10) / (25 - 10)) * (0.04 - 0.02),
  20: 0.02 + ((20 - 10) / (25 - 10)) * (0.04 - 0.02),
  25: 0.04,
  50: 0.06,
  75: 0.06 + ((75 - 50) / (100 - 50)) * (0.08 - 0.06),
  100: 0.08,
};

export function formatWeight(grams: number): string {
  if (grams < 1000) return `${grams} g`;
  return `${grams / 1000} kg`;
}

export function getPrice(slug: string, grams: number): number {
  const rate5kg = RATE_PER_KG_AT_5KG[slug];
  if (!rate5kg) throw new Error(`No pricing configured for product "${slug}"`);

  if (grams === 250) return Math.round(0.25 * rate5kg);

  const kg = grams / 1000;
  const discount = DISCOUNT_BY_KG[kg] ?? 0;
  return Math.round(kg * rate5kg * (1 - discount));
}

export function getWeightOptions(slug: string): WeightOption[] {
  return WEIGHT_GRAMS.map((grams) => ({
    grams,
    label: formatWeight(grams),
    priceInr: getPrice(slug, grams),
  }));
}

export function getStartingPrice(slug: string): number {
  return getPrice(slug, WEIGHT_GRAMS[0]);
}

export function getRatePerKg(slug: string): number {
  return RATE_PER_KG_AT_5KG[slug];
}
