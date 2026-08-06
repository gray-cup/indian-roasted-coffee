import { getCollection } from 'astro:content';
import { idToSlug } from '../utils/content';
import { getPrice, formatWeight, WEIGHT_GRAMS } from '../utils/pricing';

const BASE_URL = 'https://indianroastedcoffee.com';

function resolveUrl(path: string): string {
  return path.startsWith('http') ? path : `${BASE_URL}${path}`;
}

export async function GET() {
  const entries = await getCollection('services', ({ data }) => !data.draft);

  const products = entries
    .sort((a, b) => a.data.order - b.data.order)
    .map((entry) => {
      const slug = idToSlug(entry.id);
      const variants = WEIGHT_GRAMS.map((grams) => ({
        label: formatWeight(grams),
        weightGrams: grams,
        price: getPrice(slug, grams),
      }));
      const prices = variants.map((v) => v.price);

      return {
        slug,
        name: entry.data.title,
        shortName: entry.data.shortTitle ?? entry.data.title,
        description: entry.data.description,
        summary: entry.data.summary,
        url: `${BASE_URL}/products/${slug}`,
        image: entry.data.image ? resolveUrl(entry.data.image) : null,
        imageAlt: entry.data.imageAlt ?? entry.data.title,
        currency: 'INR',
        priceRange: { min: Math.min(...prices), max: Math.max(...prices), unit: 'INR' },
        variants,
        eligibility: entry.data.eligibility,
        keyFacts: entry.data.keyFacts,
        availability: entry.data.acceptingApplications ? 'in_stock' : 'out_of_stock',
      };
    });

  const body = {
    site: 'indianroastedcoffee.com',
    baseUrl: BASE_URL,
    currency: 'INR',
    generatedAt: new Date().toISOString(),
    products,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
