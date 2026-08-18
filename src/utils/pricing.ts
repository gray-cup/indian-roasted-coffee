export interface WeightOption {
  grams: number;
  label: string;
  priceInr: number;
}

/** A fixed price for one pack size — see `packPricing` in content.config.ts. */
export interface PackPrice {
  grams: number;
  priceInr: number;
}

// ─── Pricing tiers ────────────────────────────────────────────────────────────
// Price per kg in INR. Update these values to match your actual rates.
const TIERS = [
  { maxKg: 1,        ratePerKg: 1560 }, // retail:        300 g – 1 kg
  { maxKg: 10,       ratePerKg: 1300 }, // semi-wholesale: 2 kg – 10 kg
  { maxKg: 50,       ratePerKg: 1105 }, // wholesale:     15 kg – 50 kg
  { maxKg: Infinity, ratePerKg: 975  }, // bulk:          55 kg – 100 kg
] as const;

// ─── Available weight options ─────────────────────────────────────────────────
const GRAMS = [
  300, 500, 1_000,
  2_000, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000,
  35_000, 40_000, 45_000, 50_000, 55_000, 60_000, 65_000,
  70_000, 75_000, 80_000, 85_000, 90_000, 95_000, 100_000,
];

export function formatWeight(grams: number): string {
  if (grams < 1000) return `${grams}g`;
  return `${grams / 1000}kg`;
}

/** @param multiplier Per-product rate multiplier (see `priceMultiplier` in content.config.ts). */
export function getPrice(grams: number, multiplier = 1): number {
  const kg = grams / 1000;
  const tier = TIERS.find(t => kg <= t.maxKg)!;
  return Math.round(kg * tier.ratePerKg * multiplier);
}

export const WEIGHT_OPTIONS: WeightOption[] = GRAMS.map(grams => ({
  grams,
  label: formatWeight(grams),
  priceInr: getPrice(grams),
}));

/** Weight/price options for a specific product's rate multiplier. */
export function getWeightOptions(multiplier = 1): WeightOption[] {
  return GRAMS.map(grams => ({
    grams,
    label: formatWeight(grams),
    priceInr: getPrice(grams, multiplier),
  }));
}

// ─── Sample size ────────────────────────────────────────────────────────────
// A 200 g "try it first" size, offered on every product alongside its normal
// pack sizes — priced off the same rate as the rest of that product's sizes,
// so 3 samples from different products cost the same as buying 600 g of any
// one of them.
export const SAMPLE_GRAMS = 200;

/**
 * The authoritative price for a specific weight of a specific product —
 * used everywhere a price is shown or charged (buy widget, cart builder,
 * share links, checkout) so they can never disagree.
 *
 * When the product has fixed `packPricing` (see content.config.ts) and
 * `grams` isn't one of those exact sizes — e.g. the 200 g sample — the price
 * is derived from the smallest defined pack's implied per-kg rate rather
 * than the generic multiplier formula, since packPricing exists precisely
 * because this product's real pricing isn't a flat rate per kg.
 */
export function resolveProductPrice(
  grams: number,
  priceMultiplier: number | undefined,
  packPricing: readonly PackPrice[] | undefined
): number {
  if (packPricing && packPricing.length > 0) {
    const exact = packPricing.find((p) => p.grams === grams);
    if (exact) return exact.priceInr;
    const smallest = [...packPricing].sort((a, b) => a.grams - b.grams)[0];
    const ratePerKg = smallest.priceInr / (smallest.grams / 1000);
    return Math.round((grams / 1000) * ratePerKg);
  }
  return getPrice(grams, priceMultiplier ?? 1);
}

/** Full set of buyable pack sizes for a product, always including the 200 g sample. */
export function getProductPackOptions(
  priceMultiplier: number | undefined,
  packPricing: readonly PackPrice[] | undefined
): WeightOption[] {
  const gramsList = packPricing && packPricing.length > 0
    ? [...new Set([SAMPLE_GRAMS, ...packPricing.map((p) => p.grams)])].sort((a, b) => a - b)
    : [SAMPLE_GRAMS, 1_000, 3_000, 5_000, 10_000];

  return gramsList.map((grams) => ({
    grams,
    label: formatWeight(grams),
    priceInr: resolveProductPrice(grams, priceMultiplier, packPricing),
  }));
}

// ─── Delivery fee ───────────────────────────────────────────────────────────
// ₹50 delivery for every cart line under 1 kg (e.g. three 200 g samples in
// one line is still ₹50, not ₹150 — the charge is per line, not per unit).
// Lines of 1 kg or more ship free.
const DELIVERY_FEE_PER_LINE = 50;
const DELIVERY_FREE_THRESHOLD_GRAMS = 1_000;

export function getDeliveryFee(lines: readonly { grams: number }[]): number {
  return lines.reduce(
    (sum, line) => sum + (line.grams < DELIVERY_FREE_THRESHOLD_GRAMS ? DELIVERY_FEE_PER_LINE : 0),
    0
  );
}
