export interface WeightOption {
  grams: number;
  label: string;
  priceInr: number;
}

// ─── Pricing tiers ────────────────────────────────────────────────────────────
// Price per kg in INR. Update these values to match your actual rates.
const TIERS = [
  { maxKg: 1,        ratePerKg: 1200 }, // retail:        300 g – 1 kg
  { maxKg: 10,       ratePerKg: 1000 }, // semi-wholesale: 2 kg – 10 kg
  { maxKg: 50,       ratePerKg: 850  }, // wholesale:     15 kg – 50 kg
  { maxKg: Infinity, ratePerKg: 750  }, // bulk:          55 kg – 100 kg
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

export function getPrice(grams: number): number {
  const kg = grams / 1000;
  const tier = TIERS.find(t => kg <= t.maxKg)!;
  return Math.round(kg * tier.ratePerKg);
}

export const WEIGHT_OPTIONS: WeightOption[] = GRAMS.map(grams => ({
  grams,
  label: formatWeight(grams),
  priceInr: getPrice(grams),
}));
