import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ── Services ──────────────────────────────────────────────────────────────────
const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string().optional(),
    description: z.string(),
    summary: z.string(),
    applySlug: z.string().optional(),
    eligibility: z.array(
      z.object({ label: z.string(), value: z.string() })
    ).default([]),
    related: z.array(z.string()).default([]),
    keyFacts: z.array(
      z.object({ label: z.string(), value: z.string() })
    ).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    /** Multiplies the base per-kg rate in utils/pricing.ts. 1 = standard rate. */
    priceMultiplier: z.number().default(1),
    /**
     * Fixed prices for specific pack sizes, overriding the multiplier-based
     * tier formula — use when a product's real pricing isn't a flat rate per kg
     * (e.g. a discount for buying 1 kg vs. two 500 g packs). When set, the buy
     * widget and product listings offer exactly these pack sizes.
     */
    packPricing: z.array(
      z.object({ grams: z.number(), priceInr: z.number() })
    ).optional(),
    acceptingApplications: z.boolean().default(true),
    order: z.number().default(0),
    draft: z.boolean().default(false),
    esSlug: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
  }),
});

// ── Announcements ─────────────────────────────────────────────────────────────
const announcements = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/announcements' }),
  schema: z.object({
    title: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    severity: z.enum(['info', 'warning', 'error', 'success']).default('info'),
    linkText: z.string().optional(),
    linkUrl: z.string().optional(),
    showInEs: z.boolean().default(true),
    draft: z.boolean().default(false),
  }),
});

// ── FAQs ──────────────────────────────────────────────────────────────────────
const faqs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/faqs' }),
  schema: z.object({
    question: z.string(),
    tags: z.array(z.string()).default([]),
    order: z.number().default(0),
    draft: z.boolean().default(false),
    esQuestion: z.string().optional(),
  }),
});

export const collections = { services, announcements, faqs };
