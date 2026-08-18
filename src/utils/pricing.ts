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

// ─── Delivery fee ───────────────────────────────────────────────────────────
// Flat ₹80 up to 500 g; beyond that, ₹80 base + ₹55 per kg of the order's
// total weight (e.g. 1 kg → ₹80 + ₹55 = ₹135).
const DELIVERY_BASE_FEE = 80;
const DELIVERY_BASE_THRESHOLD_GRAMS = 500;
const DELIVERY_RATE_PER_KG = 55;

export function getDeliveryFee(totalGrams: number): number {
  if (totalGrams <= DELIVERY_BASE_THRESHOLD_GRAMS) return DELIVERY_BASE_FEE;
  const kg = totalGrams / 1000;
  return Math.round(DELIVERY_BASE_FEE + DELIVERY_RATE_PER_KG * kg);
}
